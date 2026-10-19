using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models.Scryfall;

namespace Quartzwood.Server.Services.Scryfall;

// Answers Scryfall lookups from the local scryfall.db (filled by ScryfallBulkImporter). When to ask the live API:
//  - One-off lookups (adding a card by set + number, a card's image): whenever the local data has no answer,
//    e.g. a card released since the last import. One call per deliberate action
//  - Searches that run as you type (name search, promo search, autocomplete): ONLY while the local data is
//    empty (before the first import finishes). Otherwise an empty answer just means "no such card",
//    and asking Scryfall would cost an API call on every pause in typing (every typo, every half-typed name)
// Offline, any fallback just returns "not found"
public class LocalScryfallService : IScryfallService
{
    // Set once the local data is known to exist. Static: shared by every instance (a new one is created
    // per request), so after the first check no request needs to ask the database again
    private static volatile bool _localDataKnownToExist;
    // Layouts Scryfall leaves out of searches unless "include:extras" is used (the promo search matches that)
    private static readonly string[] ExtraLayouts = ["token", "double_faced_token", "emblem", "art_series"];
    // Left out of name suggestions: art series cards are memorabilia, not cards you play or collect as cards.
    // Tokens and emblems stay in
    private static readonly string[] SuggestionExcludedLayouts = ["art_series"];

    private readonly ScryfallDbContext _db;
    private readonly ScryfallApiService _api;
    private readonly ILogger<LocalScryfallService> _logger;

    public LocalScryfallService(ScryfallDbContext db, ScryfallApiService api, ILogger<LocalScryfallService> logger)
    {
        _db = db;
        _api = api;
        _logger = logger;
    }

    // Same as https://api.scryfall.com/cards/{set}/{number}
    public async Task<ScryfallCard?> GetCardAsync(string setCode, string setNumber)
    {
        var local = await _db.Printings.AsNoTracking()
            .Where(p => p.SetCode == setCode && p.CollectorNumber == setNumber)
            .Select(p => new ScryfallCard(p.Id, p.Name, p.SetCode, p.CollectorNumber))
            .FirstOrDefaultAsync();

        return local ?? await FallbackAsync(() => _api.GetCardAsync(setCode, setNumber), $"card {setCode}/{setNumber}");
    }

    public async Task<string?> GetScryfallId(string setCode, string setNumber, string stampType, bool isList, string? cardName)
    {
        var (scryfallSetCode, scryfallSetNumber) = ScryfallPrintingKey.Resolve(setCode, setNumber, stampType, isList);
        var card = await GetCardAsync(scryfallSetCode, scryfallSetNumber);
        return card?.Id;
    }

    // Same as the API query: !"name" [year=YYYY] include:extras (game:paper), every printing, oldest first
    public async Task<IEnumerable<ScryfallCard>?> SearchAsync(string name, int? year)
    {
        var query = _db.Printings.AsNoTracking()
            .Where(p => (p.Name == name || p.FrontFaceName == name) && p.IsPaper);
        query = InYear(query, year);

        var local = await ToCardsAsync(query);
        return local.Count > 0 || await HasLocalDataAsync()
            ? local
            : await FallbackAsync(() => _api.SearchAsync(name, year), $"search \"{name}\"");
    }

    // Same as the API query: is:promo not:prerelease not:stamped -set:PRM [!"name"] [cn:N] [year=YYYY]
    public async Task<IEnumerable<ScryfallCard>?> SearchPromoAsync(string? cardName, int? year, string? setNumber)
    {
        var query = _db.Printings.AsNoTracking()
            .Where(p => p.IsPromo
                && p.SetCode != "prm"
                && (p.PromoTypes == null
                    || (!p.PromoTypes.Contains(",prerelease,") && !p.PromoTypes.Contains("stamped,")))
                && (p.Layout == null || !ExtraLayouts.Contains(p.Layout)));

        if (!string.IsNullOrWhiteSpace(cardName))
            query = query.Where(p => p.Name == cardName || p.FrontFaceName == cardName);
        if (!string.IsNullOrWhiteSpace(setNumber) && setNumber.All(char.IsDigit))
            query = query.Where(p => p.CollectorNumber == setNumber);
        query = InYear(query, year);

        var local = await ToCardsAsync(query);
        return local.Count > 0 || await HasLocalDataAsync()
            ? local
            : await FallbackAsync(() => _api.SearchPromoAsync(cardName, year, setNumber), $"promo search \"{cardName}\"");
    }

    public async Task<string?> GetImageUrlAsync(string scryfallId, string size)
    {
        var printing = await _db.Printings.AsNoTracking()
            .Where(p => p.Id == scryfallId)
            .Select(p => new { p.ImageSmall, p.ImageNormal })
            .FirstOrDefaultAsync();

        var local = size == "small" ? printing?.ImageSmall : printing?.ImageNormal;
        return local ?? await _api.GetImageUrlAsync(scryfallId, size);
    }

    public async Task<List<string>> AutocompleteAsync(string text, int limit)
    {
        // Escape LIKE's wildcards so "50%" or "a_b" are matched literally
        var escaped = text.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");

        // 1st: names that START with the text ("sol r" -> Sol Ring). Because Name has a NOCASE index,
        // SQLite can answer a "starts with" LIKE from the index instead of reading every row
        var names = await DistinctNamesAsync($"{escaped}%", limit);

        // 2nd, if there's room: names that CONTAIN it anywhere ("ring" -> Sol Ring). This one reads every row,
        // which is still only milliseconds for ~120k printings
        if (names.Count < limit)
        {
            var more = await DistinctNamesAsync($"%{escaped}%", limit + names.Count);
            names.AddRange(more.Except(names).Take(limit - names.Count));
        }

        return names.Count > 0 || await HasLocalDataAsync()
            ? names
            : await FallbackAsync(async () => (List<string>?)await _api.AutocompleteAsync(text, limit), $"autocomplete \"{text}\"") ?? [];
    }

    private async Task<List<string>> DistinctNamesAsync(string pattern, int limit)
    {
        var names = await _db.Printings.AsNoTracking()
            .Where(p => p.IsPaper
                && (p.Layout == null || !SuggestionExcludedLayouts.Contains(p.Layout))
                && (EF.Functions.Like(p.Name, pattern, @"\") || EF.Functions.Like(p.FrontFaceName, pattern, @"\")))
            .Select(p => p.Name)
            .Distinct()
            .OrderBy(name => name)
            .Take(limit)
            .ToListAsync();

        // Reversible cards are named "Sol Ring // Sol Ring": suggest them as just "Sol Ring"
        // (searching "Sol Ring" already finds that printing by its front face)
        return names
            .Select(name => name.Split(" // ").Distinct().Count() == 1 ? name.Split(" // ")[0] : name)
            .Distinct()
            .ToList();
    }

    // Local only: no API fallback, callers (import/export) fall back to the card's own set/number instead
    public async Task<Dictionary<string, ScryfallCard>> GetCardsByIdsAsync(IEnumerable<string> scryfallIds)
    {
        var ids = scryfallIds.Distinct().ToList();
        if (ids.Count == 0) return [];

        return await _db.Printings.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .Select(p => new ScryfallCard(p.Id, p.Name, p.SetCode, p.CollectorNumber))
            .ToDictionaryAsync(c => c.Id);
    }

    // year=YYYY: released during that calendar year. Dates are stored as ISO text, so this is a range check
    private static IQueryable<ScryfallPrinting> InYear(IQueryable<ScryfallPrinting> query, int? year)
    {
        if (year is null) return query;
        var from = new DateOnly(year.Value, 1, 1);
        var to = from.AddYears(1);
        return query.Where(p => p.ReleasedAt >= from && p.ReleasedAt < to);
    }

    private static Task<List<ScryfallCard>> ToCardsAsync(IQueryable<ScryfallPrinting> query)
        => query
            .OrderBy(p => p.ReleasedAt)
            .ThenBy(p => p.SetCode)
            .ThenBy(p => p.CollectorNumber)
            .Select(p => new ScryfallCard(p.Id, p.Name, p.SetCode, p.CollectorNumber))
            .ToListAsync();

    // Has the importer filled scryfall.db yet? AnyAsync stops at the first row, so even the first check is cheap;
    // once the answer is yes it's remembered (data only disappears if scryfall.db is deleted, which needs a restart)
    private async Task<bool> HasLocalDataAsync()
    {
        if (_localDataKnownToExist) return true;
        _localDataKnownToExist = await _db.Printings.AnyAsync();
        return _localDataKnownToExist;
    }

    // Ask the live API, but never let a network failure (e.g. offline) crash the request
    private async Task<T?> FallbackAsync<T>(Func<Task<T?>> apiCall, string description)
    {
        try
        {
            _logger.LogInformation("Not in local Scryfall data, asking the API: {Lookup}", description);
            return await apiCall();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Scryfall API unreachable for {Lookup}", description);
            return default;
        }
    }
}
