using System.Text.RegularExpressions;
using Quartzwood.Server.Services.ImportExport;

namespace Quartzwood.Server.Services.Cards;

// A card a list asks for: Quantity copies of Name (any printing)
public record WantedCard(string Name, int Quantity);

// A line of the list that couldn't be read, and why
public record SkippedLine(int LineNumber, string Text, string Reason);

public record ParsedCardList(string Format, List<WantedCard> Cards, List<SkippedLine> Skipped);

// Reads a list of cards to look for (mass search). Forgiving on purpose, it takes what people paste:
//   Sol Ring                          (no quantity = 1)
//   4 Lightning Bolt / 4x Lightning Bolt
//   1 Sol Ring (C21) 263 *F*          (Arena / Moxfield / MTGO deck lists: the printing is ignored)
//   a Moxfield/Deckbox or ManaBox CSV export
// Deck sections ("Sideboard", "// Commander", "Deck:") and blank lines are skipped.
// The same card on several lines is one entry with the quantities added up
public static partial class CardListParser
{
    // Different cards one list may hold: a big cube or a whole binder, but not a runaway paste
    public const int MaxCards = 1000;
    // Copies of one card: matches adding cards (a thousand basic lands is plenty)
    public const int MaxQuantity = 1000;

    // [quantity[x]] name [(SET) [number]] [*F* / *CMDR* ...]
    [GeneratedRegex(@"^(?:(?<qty>\d+)\s*[xX]?\s+)?(?<name>.+?)(?:\s+[\(\[](?<set>[A-Za-z0-9]{2,6})[\)\]](?:\s+\S+)?)?(?:\s+\*[A-Za-z]+\*)*\s*$")]
    private static partial Regex CardLine();

    // Lines that are a deck list's section headings, not cards
    private static readonly HashSet<string> Headings = new(StringComparer.OrdinalIgnoreCase)
    {
        "deck", "main", "mainboard", "maindeck", "main deck", "sideboard", "side", "commander", "commanders",
        "companion", "maybeboard", "considering", "tokens", "about", "lands", "creatures", "spells",
    };

    public static ParsedCardList Parse(string content)
    {
        var firstLine = content.Split('\n').Select(l => l.Trim()).FirstOrDefault(l => l.Length > 0) ?? string.Empty;
        // A CSV export: let the import's own reader handle it (only the name and quantity are used here)
        var csv = CollectionTransferService.Formats.FirstOrDefault(f => f.Key != "text" && f.Matches(firstLine));
        var (format, lines) = csv is not null
            ? (csv.DisplayName, ReadCsv(csv.Read(content)))
            : ("Card list", ReadText(content));

        // Same card twice (any case or spelling of accents): one entry, quantities added, first line's spelling kept
        var cards = new List<WantedCard>();
        var indexByKey = new Dictionary<string, int>();
        var skipped = new List<SkippedLine>();
        foreach (var (lineNumber, text, card, error) in lines)
        {
            if (card is null)
            {
                skipped.Add(new SkippedLine(lineNumber, text, error ?? "Couldn't read this line."));
                continue;
            }

            var key = CardNames.Normalise(card.Name);
            if (indexByKey.TryGetValue(key, out var index))
            {
                var merged = cards[index].Quantity + card.Quantity;
                cards[index] = cards[index] with { Quantity = Math.Min(merged, MaxQuantity) };
            }
            else if (cards.Count >= MaxCards)
            {
                skipped.Add(new SkippedLine(lineNumber, text, $"A list can have at most {MaxCards} different cards."));
            }
            else
            {
                indexByKey[key] = cards.Count;
                cards.Add(card);
            }
        }

        return new ParsedCardList(format, cards, skipped);
    }

    private static IEnumerable<(int, string, WantedCard?, string?)> ReadText(string content)
    {
        var lineNumber = 0;
        foreach (var rawLine in content.Split('\n'))
        {
            lineNumber++;
            var text = rawLine.Trim();
            if (text.Length == 0 || text.StartsWith("//") || text.StartsWith('#')) continue;
            // "Sideboard", "Deck:", "Commander (1)": headings, not cards
            var heading = Regex.Replace(text.TrimEnd(':'), @"\s*\(\d+\)$", "");
            if (text.EndsWith(':') || Headings.Contains(heading)) continue;

            var match = CardLine().Match(text);
            var name = match.Groups["name"].Value.Trim();
            if (!match.Success || name.Length == 0)
            {
                yield return (lineNumber, text, null, "Couldn't read this line. Expected e.g. 4 Lightning Bolt");
                continue;
            }

            var quantity = match.Groups["qty"].Success && int.TryParse(match.Groups["qty"].Value, out var qty) ? qty : 1;
            if (quantity is < 1 or > MaxQuantity)
            {
                yield return (lineNumber, text, null, $"Quantity must be between 1 and {MaxQuantity}.");
                continue;
            }

            yield return (lineNumber, text, new WantedCard(name, quantity), null);
        }
    }

    private static IEnumerable<(int, string, WantedCard?, string?)> ReadCsv(List<ParsedLine> lines)
        => lines.Select(line => line.Row is { } row
            ? (line.LineNumber, line.Text, new WantedCard(row.Name, Math.Min(row.Quantity, MaxQuantity)), (string?)null)
            : (line.LineNumber, line.Text, (WantedCard?)null, line.Error));
}
