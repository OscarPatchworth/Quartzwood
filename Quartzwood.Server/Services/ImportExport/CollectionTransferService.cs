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

    public CollectionTransferService(AppDbContext context, IScryfallService scryfall, ICardCommandService cards)
    {
        _context = context;
        _scryfall = scryfall;
        _cards = cards;
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

    // Adds every line it can into the box; lines that can't be imported are returned with the reason
    public async Task<ImportResultDto> ImportAsync(Guid boxId, string content)
    {
        var firstLine = content.Split('\n').Select(l => l.Trim()).FirstOrDefault(l => l.Length > 0) ?? string.Empty;
        var format = Formats.First(f => f.Matches(firstLine));
        var lines = format.Read(content);

        // ManaBox gives Scryfall ids: look them all up in one go to get the exact printings
        var printings = await _scryfall.GetCardsByIdsAsync(
            lines.Where(l => l.Row?.ScryfallId != null).Select(l => l.Row!.ScryfallId!));

        var failed = new List<ImportFailureDto>();
        var cardsAdded = 0;
        var linesAdded = 0;

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

            try
            {
                var remaining = row.Quantity;
                while (remaining > 0)
                {
                    var copies = Math.Min(remaining, MaxCopiesPerAdd);
                    var added = await _cards.AddAsync(new AddCardDto(
                        SetCode: setCode.ToUpperInvariant(),
                        SetNumber: number,
                        Name: row.Name,
                        Condition: row.Condition.ToString(),
                        BoxId: boxId,
                        FoilType: row.Foil.ToString(),
                        StampType: nameof(StampType.None),
                        Language: row.Language,
                        IsProxy: row.IsProxy,
                        // Files only say whether a card is altered, not by whom
                        AlterArtist: row.IsAltered ? "Unknown artist" : null,
                        PurchasePrice: row.PurchasePrice,
                        Quantity: copies));

                    if (added is null) throw new ArgumentException($"{setCode.ToUpperInvariant()} #{number} isn't on Scryfall.");
                    cardsAdded += added.Count;
                    remaining -= copies;
                }
                linesAdded++;
            }
            catch (ArgumentException ex)
            {
                failed.Add(new ImportFailureDto(line.LineNumber, line.Text, ex.Message));
            }
        }

        return new ImportResultDto(format.DisplayName, cardsAdded, linesAdded, failed);
    }

    // "Delver of Secrets" matches "Delver of Secrets // Insectile Aberration": files may name either face
    private static bool NamesMatch(string fileName, string scryfallName)
        => scryfallName.Split(" // ").Append(scryfallName)
            .Any(name => string.Equals(name.Trim(), fileName.Trim(), StringComparison.OrdinalIgnoreCase));
}
