namespace Quartzwood.Server.Services.ImportExport.Formats;

// A file format other apps use for collections (plain text list, Moxfield CSV, ManaBox CSV, ...)
public interface ITransferFormat
{
    // Used in URLs (?format=moxfield) and shown to the user
    string Key { get; }
    string DisplayName { get; }
    string FileExtension { get; }
    string ContentType { get; }

    // Does this file look like ours? Given the first non-empty line
    bool Matches(string firstLine);

    List<ParsedLine> Read(string content);
    string Write(IEnumerable<TransferRow> rows);
}
