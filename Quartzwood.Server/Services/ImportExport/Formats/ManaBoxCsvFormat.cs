using System.Text;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.ImportExport.Formats;

// ManaBox's collection CSV. It includes the Scryfall ID, so imports match the exact printing
public class ManaBoxCsvFormat : ITransferFormat
{
    public string Key => "manabox";
    public string DisplayName => "ManaBox CSV";
    public string FileExtension => "csv";
    public string ContentType => "text/csv";

    private static readonly string[] Header =
    [
        "Name", "Set code", "Set name", "Collector number", "Foil", "Rarity", "Quantity", "ManaBox ID",
        "Scryfall ID", "Purchase price", "Misprint", "Altered", "Condition", "Language", "Purchase price currency"
    ];

    public bool Matches(string firstLine)
    {
        var header = firstLine.ToLowerInvariant();
        return header.Contains("manabox id")
            || (header.Contains("set code") && header.Contains("collector number") && header.Contains("quantity"));
    }

    public List<ParsedLine> Read(string content)
    {
        var records = Csv.Read(content);
        if (records.Count == 0) return [];

        var header = Csv.HeaderIndex(records[0].Fields);
        var lines = new List<ParsedLine>();

        foreach (var record in records.Skip(1))
        {
            string? Get(params string[] names) => Csv.Get(record.Fields, header, names);

            var name = Get("Name");
            if (string.IsNullOrWhiteSpace(name))
            {
                lines.Add(ParsedLine.Fail(record.LineNumber, record.Text, "No card name."));
                continue;
            }
            if (!int.TryParse(Get("Quantity"), out var quantity) || quantity < 1)
            {
                lines.Add(ParsedLine.Fail(record.LineNumber, record.Text, "Quantity must be a whole number of at least 1."));
                continue;
            }
            var condition = TransferValues.ParseCondition(Get("Condition"));
            if (condition is null)
            {
                lines.Add(ParsedLine.Fail(record.LineNumber, record.Text, $"Unknown condition \"{Get("Condition")}\"."));
                continue;
            }

            lines.Add(ParsedLine.Ok(record.LineNumber, record.Text, new TransferRow(
                quantity,
                name,
                Get("Set code"),
                Get("Collector number"),
                Get("Scryfall ID") is { Length: > 0 } scryfallId ? scryfallId : null,
                condition.Value,
                TransferValues.ParseFoil(Get("Foil")),
                TransferValues.ParseLanguage(Get("Language")),
                IsProxy: false,
                TransferValues.ParseBool(Get("Altered")),
                TransferValues.ParsePrice(Get("Purchase price"))
            )));
        }

        return lines;
    }

    public string Write(IEnumerable<TransferRow> rows)
    {
        var csv = new StringBuilder();
        csv.AppendLine(Csv.Line(Header));
        foreach (var row in rows)
        {
            csv.AppendLine(Csv.Line(
                row.Name,
                row.SetCode?.ToUpperInvariant(),
                "",
                row.CollectorNumber,
                row.Foil switch { FoilType.Traditional => "foil", FoilType.Other => "etched", _ => "normal" },
                "",
                row.Quantity.ToString(),
                "",
                row.ScryfallId,
                TransferValues.FormatPrice(row.PurchasePrice),
                "false",
                row.IsAltered ? "true" : "false",
                ConditionName(row.Condition),
                row.Language,
                row.PurchasePrice is null ? "" : "USD"
            ));
        }
        return csv.ToString();
    }

    private static string ConditionName(Condition condition) => condition switch
    {
        Condition.NM => "near_mint",
        Condition.LP => "light_played",
        Condition.MP => "played",
        Condition.HP => "poor",
        Condition.DMG => "poor",
        _ => "near_mint"
    };
}
