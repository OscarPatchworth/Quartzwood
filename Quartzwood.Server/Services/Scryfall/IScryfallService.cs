namespace Quartzwood.Server.Services.Scryfall;

public record ScryfallCard(
    string Id,
    string Name,
    string Set,
    string CollectorNumber
);

public record ScryfallYearName(
    int Year,
    string Name
);

// Registered as LocalScryfallService (local scryfall.db first, ScryfallApiService as fallback)
public interface IScryfallService
{
    Task<ScryfallCard?> GetCardAsync(string setCode, string setNumber);
    Task<IEnumerable<ScryfallCard>?> SearchAsync(string name, int? year);
    Task<string?> GetScryfallId(string setCode, string setNumber, string stampType, bool isList, string? cardName);
    Task<IEnumerable<ScryfallCard>?> SearchPromoAsync(string? cardName, int? year, string? setNumber);
    // Where the card's image lives: size is "small" or "normal"
    Task<string?> GetImageUrlAsync(string scryfallId, string size);
    // Many printings at once by Scryfall id (import/export); ids it can't find are simply left out
    Task<Dictionary<string, ScryfallCard>> GetCardsByIdsAsync(IEnumerable<string> scryfallIds);
    // Card names for the add bar's suggestions as you type: names starting with the text first
    Task<List<string>> AutocompleteAsync(string text, int limit);
}
