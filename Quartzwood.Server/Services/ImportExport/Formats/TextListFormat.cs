using System.Text;
using System.Text.RegularExpressions;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.ImportExport.Formats;

// The plain list most apps (Moxfield, Archidekt, MTGGoldfish, Arena, ...) can read and write:
//   4 Sol Ring (C21) 263
//   1x Lightning Bolt [2XM] 117 *F*
// Only quantity, name, printing and foil: condition/language etc. aren't part of this format
public partial class TextListFormat : ITransferFormat
{
    public string Key => "text";
    public string DisplayName => "Plain text list";
    public string FileExtension => "txt";
    public string ContentType => "text/plain";

    // quantity [x] name (SET) number [*F*|*E*]   - () or [] around the set
    [GeneratedRegex(@"^(?<qty>\d+)x?\s+(?<name>.+?)\s+[\(\[](?<set>[A-Za-z0-9]{2,6})[\)\]]\s+(?<number>\S+?)(?:\s+(?<foil>\*[FE]\*))?\s*$")]
    private static partial Regex LineWithPrinting();

    // quantity [x] name, no printing: can't be matched to a specific card
    [GeneratedRegex(@"^(?<qty>\d+)x?\s+(?<name>.+?)\s*$")]
    private static partial Regex LineNameOnly();

    // The fallback format: anything that isn't a recognised CSV header
    public bool Matches(string firstLine) => true;

    public List<ParsedLine> Read(string content)
    {
        var lines = new List<ParsedLine>();
        var lineNumber = 0;

        foreach (var rawLine in content.Split('\n'))
        {
            lineNumber++;
            var text = rawLine.Trim();
            // Blank lines, comments and section headings like "Sideboard" / "// Commander"
            if (text.Length == 0 || text.StartsWith("//") || text.StartsWith('#') || !char.IsDigit(text[0]))
                continue;

            var match = LineWithPrinting().Match(text);
            if (!match.Success)
            {
                lines.Add(ParsedLine.Fail(lineNumber, text, LineNameOnly().IsMatch(text)
                    ? "No set code and collector number, e.g. 1 Sol Ring (C21) 263: add it with the add-card bar instead."
                    : "Couldn't read this line. Expected e.g. 4 Sol Ring (C21) 263"));
                continue;
            }

            var quantity = int.Parse(match.Groups["qty"].Value);
            if (quantity < 1)
            {
                lines.Add(ParsedLine.Fail(lineNumber, text, "Quantity must be at least 1."));
                continue;
            }

            lines.Add(ParsedLine.Ok(lineNumber, text, new TransferRow(
                quantity,
                match.Groups["name"].Value,
                match.Groups["set"].Value,
                match.Groups["number"].Value,
                ScryfallId: null,
                Condition.NM,
                match.Groups["foil"].Value switch { "*F*" => FoilType.Traditional, "*E*" => FoilType.Other, _ => FoilType.None },
                "en",
                IsProxy: false,
                IsAltered: false,
                PurchasePrice: null
            )));
        }

        return lines;
    }

    public string Write(IEnumerable<TransferRow> rows)
    {
        var text = new StringBuilder();
        foreach (var row in rows)
        {
            var foil = row.Foil switch { FoilType.Traditional => " *F*", FoilType.Other => " *E*", _ => "" };
            text.AppendLine($"{row.Quantity} {row.Name} ({row.SetCode?.ToUpperInvariant()}) {row.CollectorNumber}{foil}");
        }
        return text.ToString();
    }
}
