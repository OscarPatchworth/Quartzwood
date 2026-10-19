using System.Text;

namespace Quartzwood.Server.Services.ImportExport.Formats;

// Minimal CSV (RFC 4180) reading/writing: quoted fields, "" for a quote inside quotes,
// and commas/newlines inside quotes, e.g. "Teferi, Time Raveler"
public static class Csv
{
    public record Record(int LineNumber, string Text, List<string> Fields);

    public static List<Record> Read(string content)
    {
        var records = new List<Record>();
        var fields = new List<string>();
        var field = new StringBuilder();
        var raw = new StringBuilder();
        var inQuotes = false;
        var line = 1;
        var recordStartLine = 1;

        void EndRecord()
        {
            fields.Add(field.ToString());
            field.Clear();
            // Skip blank lines
            if (fields.Count > 1 || fields[0].Length > 0)
                records.Add(new Record(recordStartLine, raw.ToString().TrimEnd('\r'), fields));
            fields = [];
            raw.Clear();
            recordStartLine = line;
        }

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];

            if (inQuotes)
            {
                raw.Append(c);
                if (c == '"')
                {
                    if (i + 1 < content.Length && content[i + 1] == '"') { field.Append('"'); raw.Append('"'); i++; }
                    else inQuotes = false;
                }
                else
                {
                    if (c == '\n') line++;
                    field.Append(c);
                }
                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    raw.Append(c);
                    break;
                case ',':
                    fields.Add(field.ToString());
                    field.Clear();
                    raw.Append(c);
                    break;
                case '\r':
                    break;
                case '\n':
                    line++;
                    EndRecord();
                    break;
                default:
                    field.Append(c);
                    raw.Append(c);
                    break;
            }
        }
        if (field.Length > 0 || fields.Count > 0) EndRecord();

        return records;
    }

    // Always quotes, as Moxfield's own export does
    public static string Field(string? value) => "\"" + (value ?? string.Empty).Replace("\"", "\"\"") + "\"";

    public static string Line(params string?[] values) => string.Join(",", values.Select(Field));

    // Header name -> column index, case-insensitive, accepting several names for the same column
    public static Dictionary<string, int> HeaderIndex(List<string> header)
        => header
            .Select((name, index) => (name: name.Trim(), index))
            .GroupBy(h => h.name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().index, StringComparer.OrdinalIgnoreCase);

    public static string? Get(List<string> fields, Dictionary<string, int> header, params string[] names)
    {
        foreach (var name in names)
            if (header.TryGetValue(name, out var index) && index < fields.Count)
                return fields[index].Trim();
        return null;
    }
}
