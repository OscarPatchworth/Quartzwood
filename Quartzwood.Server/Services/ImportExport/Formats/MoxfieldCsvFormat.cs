using System.Text;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.ImportExport.Formats;

// Moxfield's collection CSV. Its columns come from Deckbox's CSV, so Deckbox exports read too
// (Deckbox calls a couple of columns differently: "Card Number", "Altered Art")
public class MoxfieldCsvFormat : ITransferFormat
{
    public string Key => "moxfield";
    public string DisplayName => "Moxfield / Deckbox CSV";
    public string FileExtension => "csv";
    public string ContentType => "text/csv";

    private static readonly string[] Header =
    [
        "Count", "Tradelist Count", "Name", "Edition", "Condition", "Language", "Foil",
        "Tags", "Last Modified", "Collector Number", "Alter", "Proxy", "Purchase Price"
    ];

    public bool Matches(string firstLine)
    {
        var header = firstLine.ToLowerInvariant();
        return header.Contains("count") && header.Contains("name") && header.Contains("edition");
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
            if (!int.TryParse(Get("Count"), out var quantity) || quantity < 1)
            {
                lines.Add(ParsedLine.Fail(record.LineNumber, record.Text, "Count must be a whole number of at least 1."));
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
                Get("Edition"),
                Get("Collector Number", "Card Number"),
                ScryfallId: null,
                condition.Value,
                TransferValues.ParseFoil(Get("Foil")),
                TransferValues.ParseLanguage(Get("Language")),
                TransferValues.ParseBool(Get("Proxy")),
                TransferValues.ParseBool(Get("Alter", "Altered Art")),
                TransferValues.ParsePrice(Get("Purchase Price", "My Price"))
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
                row.Quantity.ToString(),
                "0",
                row.Name,
                row.SetCode?.ToLowerInvariant(),
                ConditionName(row.Condition),
                TransferValues.LanguageName(row.Language),
                row.Foil switch { FoilType.Traditional => "foil", FoilType.Other => "etched", _ => "" },
                "",
                "",
                row.CollectorNumber,
                row.IsAltered ? "True" : "False",
                row.IsProxy ? "True" : "False",
                TransferValues.FormatPrice(row.PurchasePrice)
            ));
        }
        return csv.ToString();
    }

    private static string ConditionName(Condition condition) => condition switch
    {
        Condition.NM => "Near Mint",
        Condition.LP => "Lightly Played",
        Condition.MP => "Moderately Played",
        Condition.HP => "Heavily Played",
        Condition.DMG => "Damaged",
        _ => "Near Mint"
    };
}
