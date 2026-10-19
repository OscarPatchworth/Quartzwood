namespace Quartzwood.Server.Models.Scryfall;

// A single row (Id = 1) recording the last bulk import, so the importer knows when the next one is due
public class ScryfallImportState
{
    public int Id { get; set; } = 1;

    // Scryfall's "updated_at" for the bulk file we imported
    public DateTimeOffset? BulkUpdatedAt { get; set; }
    // When we last checked/imported: the refresh interval counts from here
    public DateTimeOffset? ImportedAt { get; set; }
    public int CardCount { get; set; }
}
