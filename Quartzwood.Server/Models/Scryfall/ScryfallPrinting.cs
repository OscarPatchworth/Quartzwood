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

    // Gameplay data, for sorting/filtering a collection: looked up by each card's ScryfallId when sorting
    // Mana value ("cmc"): a double because a few joke cards cost half a mana
    public double? ManaValue { get; set; }
    // e.g. "{2}{U}{U}"; double-faced cards: the front face's
    public string? ManaCost { get; set; }
    // Letters in WUBRG order, e.g. "UR"; "" = colourless; null = unknown
    public string? Colors { get; set; }
    public string? ColorIdentity { get; set; }
    // e.g. "Legendary Creature — Elf Druid"; double-faced: "Front type // Back type"
    public string? TypeLine { get; set; }

    // TCGplayer market prices in US dollars, refreshed daily by Scryfall (null = no price). A printing can have
    // up to three: normal, foil, and etched foil. CardPrice picks the one matching a card's foil type
    public decimal? PriceUsd { get; set; }
    public decimal? PriceUsdFoil { get; set; }
    public decimal? PriceUsdEtched { get; set; }

    // cards.scryfall.io CDN URLs (front face for double-faced cards)
    public string? ImageSmall { get; set; }
    public string? ImageNormal { get; set; }
}
