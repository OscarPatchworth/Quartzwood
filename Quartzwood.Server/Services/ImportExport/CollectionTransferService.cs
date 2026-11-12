using System.Text;
using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.ImportExport.Formats;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.ImportExport;

public record ExportFile(string FileName, string ContentType, byte[] Content);

// Import/export of cards in other apps' file formats.
// Access checks happen in the controller: by the time we're called, the group/box is the user's
public class CollectionTransferService
{
    // Checked in this order when detecting an import's format: plain text last, it accepts anything
    public static readonly IReadOnlyList<ITransferFormat> Formats =
        [new ManaBoxCsvFormat(), new MoxfieldCsvFormat(), new TextListFormat()];

    // Matches AddCardDto's per-request limit: bigger quantities are added in chunks
    private const int MaxCopiesPerAdd = 1000;

    private readonly AppDbContext _context;
    private readonly IScryfallService _scryfall;
    private readonly ICardCommandService _cards;
    private readonly ICardQueryService _cardQueries;

    public CollectionTransferService(AppDbContext context, IScryfallService scryfall, ICardCommandService cards,
        ICardQueryService cardQueries)
    {
        _context = context;
        _scryfall = scryfall;
        _cards = cards;
        _cardQueries = cardQueries;
    }

    public static ITransferFormat? FindFormat(string key)
        => Formats.FirstOrDefault(f => string.Equals(f.Key, key, StringComparison.OrdinalIgnoreCase));

    // ---------- Export ----------

    // Everything in the group and every group inside it, at any depth (the root group = the whole collection)
    public async Task<ExportFile?> ExportGroupAsync(Guid groupId, ITransferFormat format)
    {
        var group = await _context.Groups.AsNoTracking().FirstOrDefaultAsync(g => g.Id == groupId);
        if (group is null) return null;

        // Every group in this Entity in one query, then walk down from this group in memory
        var tree = await _context.Groups.AsNoTracking()
            .Where(g => g.EntityId == group.EntityId)
            .Select(g => new { g.Id, g.ParentGroupId })
            .ToListAsync();
        var childrenOf = tree.ToLookup(g => g.ParentGroupId);
        var groupIds = new List<Guid>();
        var toVisit = new Stack<Guid>([groupId]);
        while (toVisit.Count > 0)
        {
            var id = toVisit.Pop();
            groupIds.Add(id);
            foreach (var child in childrenOf[id]) toVisit.Push(child.Id);
        }

        var cards = await _context.Cards.AsNoTracking()
            .Where(c => groupIds.Contains(c.Box.GroupId))
            .ToListAsync();

        var fileLabel = group.ParentGroupId is null ? "collection" : group.Name;
        return await BuildExportAsync(cards, fileLabel, format);
    }

    public async Task<ExportFile?> ExportBoxAsync(Guid boxId, ITransferFormat format)
    {
        var box = await _context.Boxes.AsNoTracking().FirstOrDefaultAsync(b => b.Id == boxId);
        if (box is null) return null;

        var cards = await _context.Cards.AsNoTracking().Where(c => c.BoxId == boxId).ToListAsync();
        return await BuildExportAsync(cards, box.Name, format);
    }

    private async Task<ExportFile> BuildExportAsync(List<CardInstance> cards, string fileLabel, ITransferFormat format)
    {
        // Other apps identify printings the way Scryfall does (e.g. List cards are plst / IKO-1),
        // so use the Scryfall printing wherever we know it
        var printings = await _scryfall.GetCardsByIdsAsync(
            cards.Where(c => c.ScryfallId != null).Select(c => c.ScryfallId!));

        var rows = cards
            .Select(card =>
            {
                ScryfallCard? printing = null;
                if (card.ScryfallId != null) printings.TryGetValue(card.ScryfallId, out printing);

                var (setCode, number) = printing is not null
                    ? (printing.Set, printing.CollectorNumber)
                    : card.IsList
                        ? ("plst", $"{card.SetCode}-{card.SetNumber}")
                        : (card.SetCode, card.SetNumber);

                return new TransferRow(
                    1,
                    printing?.Name ?? card.Name ?? "Unknown card",
                    setCode,
                    number,
                    card.ScryfallId,
                    card.Condition,
                    card.FoilType,
                    card.Language,
                    card.IsProxy,
                    card.AlterArtist != null,
                    card.PurchasePrice);
            })
            // Identical copies become one line with a quantity
            .GroupBy(row => row with { Quantity = 0 })
            .Select(group => group.Key with { Quantity = group.Count() })
            .OrderBy(row => row.Name)
            .ThenBy(row => row.SetCode)
            .ThenBy(row => row.CollectorNumber);

        var content = format.Write(rows);
        var safeLabel = string.Concat(fileLabel.Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c)).Trim();
        return new ExportFile(
            $"{safeLabel}-{format.Key}.{format.FileExtension}",
            $"{format.ContentType}; charset=utf-8",
            Encoding.UTF8.GetBytes(content));
    }

    // ---------- Import ----------

    // A line whose printing has been checked against Scryfall: ready to add, or to compare with the box
    private record ResolvedLine(ParsedLine Line, TransferRow Row, string SetCode, string Number, ScryfallCard Printing);

    // Reads the file and checks every line's printing. Shared by import and compare, so the compare view
    // shows exactly the cards an import would add
    private async Task<(string Format, List<ResolvedLine> Lines, List<ImportFailureDto> Failed)> ResolveAsync(string content)
    {
        var firstLine = content.Split('\n').Select(l => l.Trim()).FirstOrDefault(l => l.Length > 0) ?? string.Empty;
        var format = Formats.First(f => f.Matches(firstLine));
        var lines = format.Read(content);

        // ManaBox gives Scryfall ids: look them all up in one go to get the exact printings
        var printings = await _scryfall.GetCardsByIdsAsync(
            lines.Where(l => l.Row?.ScryfallId != null).Select(l => l.Row!.ScryfallId!));

        var resolved = new List<ResolvedLine>();
        var failed = new List<ImportFailureDto>();

        foreach (var line in lines)
        {
            if (line.Row is null)
            {
                failed.Add(new ImportFailureDto(line.LineNumber, line.Text, line.Error ?? "Couldn't read this line."));
                continue;
            }

            var row = line.Row;
            var (setCode, number) = row.ScryfallId != null && printings.TryGetValue(row.ScryfallId, out var printing)
                ? (printing.Set, printing.CollectorNumber)
                : (row.SetCode, row.CollectorNumber);

            if (string.IsNullOrWhiteSpace(setCode) || string.IsNullOrWhiteSpace(number))
            {
                failed.Add(new ImportFailureDto(line.LineNumber, line.Text, "No set code and collector number."));
                continue;
            }

            // The set + number decide the printing, so make sure it's the card the file names:
            // a typo'd collector number would otherwise silently add a different card
            var scryfallCard = await _scryfall.GetCardAsync(setCode.ToUpperInvariant(), number);
            if (scryfallCard is null)
            {
                failed.Add(new ImportFailureDto(line.LineNumber, line.Text, $"{setCode.ToUpperInvariant()} #{number} isn't on Scryfall."));
                continue;
            }
            if (!NamesMatch(row.Name, scryfallCard.Name))
            {
                failed.Add(new ImportFailureDto(line.LineNumber, line.Text,
                    $"{setCode.ToUpperInvariant()} #{number} is {scryfallCard.Name}, not {row.Name}: check the collector number."));
                continue;
            }

            resolved.Add(new ResolvedLine(line, row, setCode.ToUpperInvariant(), number, scryfallCard));
        }

        return (format.DisplayName, resolved, failed);
    }

    // Some identical cards from the list, ready to add: what the file says, plus any changes made in the compare
    // view (a ManaBox scan doesn't know a card is foil or Japanese, say)
    private record IncomingCards(ResolvedLine Source, int Quantity, Condition Condition, FoilType Foil, StampType Stamp,
        string Language, bool IsProxy, bool IsSigned, bool IsList, string? AlterArtist, string? Notes)
    {
        // Names a stack of these in an ImportEditDto: identical cards have the same key
        public string Key => string.Join('|', Source.SetCode, Source.Number, Condition, Foil, Stamp, Language,
            IsProxy, IsSigned, IsList, AlterArtist, Notes);
    }

    // The list's cards, with the edits applied in order. Edits take copies from the END of the list first
    // (the last cards scanned), and the changed ones become separate cards, so "2 of these 6 are foil" works
    private async Task<(string Format, List<IncomingCards> Cards, List<ImportFailureDto> Failed)> PrepareAsync(
        string content, IReadOnlyList<ImportEditDto>? edits)
    {
        var (format, lines, failed) = await ResolveAsync(content);
        var cards = lines.Select(l => new IncomingCards(l, l.Row.Quantity, l.Row.Condition, l.Row.Foil, StampType.None,
                l.Row.Language, l.Row.IsProxy, false, false,
                // Files only say whether a card is altered, not by whom
                l.Row.IsAltered ? "Unknown artist" : null, null))
            .ToList();

        foreach (var edit in edits ?? [])
        {
            if (edit.Count < 1) throw new ArgumentException("An edit must change at least one card.");
            var remaining = edit.Count;
            for (var i = cards.Count - 1; i >= 0 && remaining > 0; i--)
            {
                var card = cards[i];
                if (card.Key != edit.Key) continue;

                var taken = Math.Min(remaining, card.Quantity);
                remaining -= taken;
                var rest = card.Quantity - taken;
                var changed = edit.Remove ? null : Apply(card with { Quantity = taken }, edit);

                if (rest > 0)
                {
                    cards[i] = card with { Quantity = rest };
                    if (changed is not null) cards.Insert(i + 1, changed);
                }
                else if (changed is not null) cards[i] = changed;
                else cards.RemoveAt(i);
            }
            // Fewer than that left (the list changed since): the edit applies to the ones there are
        }

        return (format, cards, failed);
    }

    private static IncomingCards Apply(IncomingCards card, ImportEditDto edit)
    {
        static T Parse<T>(string? value, T current, string what) where T : struct, Enum
            => value is null ? current
                : Enum.TryParse<T>(value, true, out var parsed) ? parsed
                : throw new ArgumentException($"Invalid {what}: {value}");

        var language = edit.Language?.Trim();
        if (language == "") throw new ArgumentException("Language can't be empty.");
        return card with
        {
            Condition = Parse(edit.Condition, card.Condition, "condition"),
            Foil = Parse(edit.FoilType, card.Foil, "foil type"),
            Stamp = Parse(edit.StampType, card.Stamp, "stamp type"),
            Language = language ?? card.Language,
            IsProxy = edit.IsProxy,
            IsSigned = edit.IsSigned,
            IsList = edit.IsList,
            AlterArtist = string.IsNullOrWhiteSpace(edit.AlterArtist) ? null : edit.AlterArtist.Trim(),
            Notes = string.IsNullOrWhiteSpace(edit.Notes) ? null : edit.Notes,
        };
    }

    // Adds every line it can into the box (behind dividerId, if given: one in this box, checked by the caller),
    // with the compare view's edits; lines that can't be imported are returned with the reason
    public async Task<ImportResultDto> ImportAsync(Guid boxId, string content, Guid? dividerId = null,
        IReadOnlyList<ImportEditDto>? edits = null)
    {
        var (format, cards, failed) = await PrepareAsync(content, edits);
        var cardsAdded = 0;
        var addedLines = new HashSet<int>();
        var failedLines = new HashSet<int>();

        foreach (var card in cards)
        {
            var (line, row, setCode, number, _) = card.Source;
            try
            {
                var remaining = card.Quantity;
                while (remaining > 0)
                {
                    var copies = Math.Min(remaining, MaxCopiesPerAdd);
                    var added = await _cards.AddAsync(new AddCardDto(
                        SetCode: setCode,
                        SetNumber: number,
                        Name: row.Name,
                        Condition: card.Condition.ToString(),
                        BoxId: boxId,
                        FoilType: card.Foil.ToString(),
                        StampType: card.Stamp.ToString(),
                        Language: card.Language,
                        IsProxy: card.IsProxy,
                        IsSigned: card.IsSigned,
                        IsList: card.IsList,
                        AlterArtist: card.AlterArtist,
                        Notes: card.Notes,
                        PurchasePrice: row.PurchasePrice,
                        Quantity: copies,
                        DividerId: dividerId));

                    if (added is null) throw new ArgumentException($"{setCode} #{number} isn't on Scryfall.");
                    cardsAdded += added.Count;
                    remaining -= copies;
                }
                addedLines.Add(line.LineNumber);
            }
            catch (ArgumentException ex)
            {
                // An edited line is split in several: report it once
                if (failedLines.Add(line.LineNumber)) failed.Add(new ImportFailureDto(line.LineNumber, line.Text, ex.Message));
            }
        }

        return new ImportResultDto(format, cardsAdded, addedLines.Count, failed.OrderBy(f => f.Line).ToList());
    }

    // What an import would add, next to what's already there (the whole box, or one divider's cards), without
    // adding anything: one column per printing, in the chosen sort order, so you can see where each new card goes
    // and which ones join cards you already have
    public async Task<ImportCompareDto> CompareAsync(Guid boxId, string content, Guid? dividerId, CardSort sort, bool descending,
        IReadOnlyList<ImportEditDto>? edits = null)
    {
        var (format, cards, failed) = await PrepareAsync(content, edits);

        var existing = (await _cardQueries.GetByBoxGroupedAsync(boxId, new CardListOptions()))
            .Where(stack => dividerId is null || stack.DividerId == dividerId)
            .ToList();

        // Identical cards in the file more than once: one stack
        var incoming = cards
            .GroupBy(c => c.Key)
            .Select(g =>
            {
                var c = g.First();
                return new ImportIncomingStackDto(g.Key, c.Source.Printing.Name, c.Source.SetCode, c.Source.Number,
                    c.Source.Printing.Id, c.Condition.ToString(), c.Foil.ToString(), c.Stamp.ToString(), c.Language,
                    c.IsProxy, c.IsSigned, c.IsList, c.AlterArtist, c.Notes, g.Sum(x => x.Quantity));
            })
            .ToList();

        // A column per printing (set + number), whichever side it's on
        static string PrintingKey(string? setCode, string? number, string? name)
            => setCode is null || number is null ? $"?{name}" : $"{setCode.ToUpperInvariant()}|{number}";
        var keys = existing.Select(s => PrintingKey(s.SetCode, s.SetNumber, s.Name))
            .Concat(incoming.Select(s => PrintingKey(s.SetCode, s.SetNumber, s.Name)))
            .Distinct();
        var columns = keys.Select(key => new ImportCompareColumnDto(
                existing.Where(s => PrintingKey(s.SetCode, s.SetNumber, s.Name) == key).ToList(),
                incoming.Where(s => PrintingKey(s.SetCode, s.SetNumber, s.Name) == key).ToList()))
            .ToList();

        // Sorted with the same rules as the box page, using the column's printing
        var gameplay = await _scryfall.GetGameplayByIdsAsync(columns.Select(ColumnScryfallId).OfType<string>());
        var sorted = CardSorting.Sort(columns, column =>
        {
            var printing = ColumnScryfallId(column) is { } id ? gameplay.GetValueOrDefault(id) : null;
            var first = column.Existing.FirstOrDefault();
            var name = first?.Name ?? column.Incoming[0].Name;
            return new CardSortFields(name, null, first?.SetCode ?? column.Incoming.FirstOrDefault()?.SetCode,
                first?.SetNumber ?? column.Incoming.FirstOrDefault()?.SetNumber, printing, CardPrice.For(printing, FoilType.None));
        }, sort, descending);

        return new ImportCompareDto(format, sorted, incoming.Sum(s => s.Count), failed);
    }

    private static string? ColumnScryfallId(ImportCompareColumnDto column)
        => column.Existing.Select(s => s.ScryfallId).FirstOrDefault(id => id != null) ?? column.Incoming.FirstOrDefault()?.ScryfallId;

    public Task<bool> IsDividerInBoxAsync(Guid dividerId, Guid boxId)
        => _context.Dividers.AnyAsync(d => d.Id == dividerId && d.BoxId == boxId);

    // "Delver of Secrets" matches "Delver of Secrets // Insectile Aberration": files may name either face
    private static bool NamesMatch(string fileName, string scryfallName)
        => scryfallName.Split(" // ").Append(scryfallName)
            .Any(name => string.Equals(name.Trim(), fileName.Trim(), StringComparison.OrdinalIgnoreCase));
}
