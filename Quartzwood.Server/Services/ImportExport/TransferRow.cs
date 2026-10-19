using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.ImportExport;

// One line of an import or export file: Quantity identical copies of a printing.
// Every format reads into and writes from this, so formats never deal with the database
public record TransferRow(
    int Quantity,
    string Name,
    // As Scryfall files the printing, e.g. "c21" / "263", or "plst" / "IKO-1" for a List card
    string? SetCode,
    string? CollectorNumber,
    // ManaBox includes it: lets an import match the exact printing
    string? ScryfallId,
    Condition Condition,
    FoilType Foil,
    // Scryfall-style code: "en", "ja", "de", ...
    string Language,
    bool IsProxy,
    bool IsAltered,
    decimal? PurchasePrice
);

// A line read from an import file: either a Row, or an Error explaining why it couldn't be read
public record ParsedLine(int LineNumber, string Text, TransferRow? Row, string? Error)
{
    public static ParsedLine Ok(int lineNumber, string text, TransferRow row) => new(lineNumber, text, row, null);
    public static ParsedLine Fail(int lineNumber, string text, string error) => new(lineNumber, text, null, error);
}
