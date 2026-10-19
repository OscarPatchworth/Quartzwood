namespace Quartzwood.Server.Models.Scryfall;

// One printing of a card, from Scryfall's "default_cards" bulk file.
// Only the fields Quartzwood looks things up by (or shows) are kept: this is a disposable cache in scryfall.db
public class ScryfallPrinting
{
    // Scryfall's card id (a GUID string), the same value stored in CardInstance.ScryfallId
    public string Id { get; set; } = string.Empty;

    // Full name, e.g. "Delver of Secrets // Insectile Aberration" for a double-faced card
    public string Name { get; set; } = string.Empty;
    // Front face only ("Delver of Secrets"), so a search for the printed front name still matches
    public string? FrontFaceName { get; set; }

    // Lowercase, as Scryfall writes it ("iko")
    public string SetCode { get; set; } = string.Empty;
    public string? SetType { get; set; }
    public string CollectorNumber { get; set; } = string.Empty;
    public string? Lang { get; set; }
    public DateOnly? ReleasedAt { get; set; }

    public bool IsPaper { get; set; }
    public bool IsPromo { get; set; }
    // Comma-wrapped list for exact matching in SQL, e.g. ",prerelease,datestamped,"
    public string? PromoTypes { get; set; }
    public string? Layout { get; set; }

    // cards.scryfall.io CDN URLs (front face for double-faced cards)
    public string? ImageSmall { get; set; }
    public string? ImageNormal { get; set; }
}
