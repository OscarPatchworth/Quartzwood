using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

// How a card list (box page, collection search) is filtered and sorted.
// Both use data from scryfall.db, so both run in memory after one batched lookup, and BEFORE the
// search's 200-row cut: otherwise "mana value 2-4" would only filter the first 200 names
public record CardListOptions(
    CardSort Sort = CardSort.Name,
    bool Descending = false,
    // Inclusive ranges; either end can be left open (null)
    double? ManaValueMin = null,
    double? ManaValueMax = null,
    // The card's price for its foil type (see CardPrice)
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    // Tag names the card must ALL have (anyone's tag with that name counts); null/empty = no tag filter
    IReadOnlyList<string>? Tags = null
)
{
    private bool HasManaValueFilter => ManaValueMin is not null || ManaValueMax is not null;
    private bool HasPriceFilter => PriceMin is not null || PriceMax is not null;
    private bool HasTagFilter => Tags is { Count: > 0 };
    public bool HasFilter => HasManaValueFilter || HasPriceFilter || HasTagFilter;

    // Whether filtering or sorting needs the printings' data from scryfall.db (name/added sorts don't)
    public bool NeedsGameplay => HasFilter || Sort is CardSort.Printed or CardSort.ManaValue or CardSort.Color or CardSort.Price;

    // A card with no mana value / price (no printing in the local data, or no price on Scryfall) can't be
    // shown to be in range, so while that filter is set it's left out
    public bool Matches(ScryfallGameplay? gameplay, decimal? price, IReadOnlyList<string> tags)
    {
        if (HasManaValueFilter && !InRange(gameplay?.ManaValue, ManaValueMin, ManaValueMax)) return false;
        if (HasPriceFilter && !InRange(price, PriceMin, PriceMax)) return false;
        if (HasTagFilter && !Tags!.All(wanted => tags.Contains(wanted, StringComparer.OrdinalIgnoreCase))) return false;
        return true;
    }

    private static bool InRange<T>(T? value, T? min, T? max) where T : struct, IComparable<T>
        => value is { } v
            && (min is null || v.CompareTo(min.Value) >= 0)
            && (max is null || v.CompareTo(max.Value) <= 0);

    // Checks the query string values; returns an error message, or null when they're fine
    public static string? Validate(double? manaValueMin, double? manaValueMax, decimal? priceMin, decimal? priceMax)
    {
        if (manaValueMin < 0 || manaValueMax < 0) return "Mana value can't be negative.";
        if (manaValueMin > manaValueMax) return "The lowest mana value is above the highest.";
        if (priceMin < 0 || priceMax < 0) return "Price can't be negative.";
        if (priceMin > priceMax) return "The lowest price is above the highest.";
        return null;
    }
}
