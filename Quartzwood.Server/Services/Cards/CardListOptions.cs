using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

// How a card list (box page, collection search) is filtered and sorted.
// Both use data from scryfall.db, so both run in memory after one batched lookup, and BEFORE the
// search's 200-row cut: otherwise "mana value 2-4" would only filter the first 200 names
public record CardListOptions(
    CardSort Sort = CardSort.Name,
    bool Descending = false,
    // Inclusive range; either end can be left open (null)
    double? ManaValueMin = null,
    double? ManaValueMax = null
)
{
    public bool HasFilter => ManaValueMin is not null || ManaValueMax is not null;

    // Whether filtering or sorting needs the printings' data from scryfall.db (name/added sorts don't)
    public bool NeedsGameplay => HasFilter || Sort is CardSort.Printed or CardSort.ManaValue or CardSort.Color;

    // A card with no mana value (no printing in the local data) can't be shown to be in range, so it's left out
    public bool Matches(ScryfallGameplay? gameplay)
    {
        if (!HasFilter) return true;
        if (gameplay?.ManaValue is not { } manaValue) return false;
        return (ManaValueMin is null || manaValue >= ManaValueMin)
            && (ManaValueMax is null || manaValue <= ManaValueMax);
    }

    // Checks the query string values; returns an error message, or null when they're fine
    public static string? Validate(double? manaValueMin, double? manaValueMax)
    {
        if (manaValueMin < 0 || manaValueMax < 0) return "Mana value can't be negative.";
        if (manaValueMin > manaValueMax) return "The lowest mana value is above the highest.";
        return null;
    }
}
