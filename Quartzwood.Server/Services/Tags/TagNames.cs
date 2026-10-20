using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Tags;

public static class TagNames
{
    // A card's tag names as shown: A-Z, and a name used by two people ("Trade" by Bob and by Alice) only once.
    // Needs CardTags + Tag loaded
    public static List<string> Of(CardInstance card)
        => card.CardTags
            .Select(ct => ct.Tag.Name)
            .DistinctBy(name => name.ToLowerInvariant())
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    // One string for a card's whole tag set, so cards can be grouped by it: same tags = same key
    public static string Key(CardInstance card)
        => string.Join("\u001f", Of(card).Select(name => name.ToLowerInvariant()));
}
