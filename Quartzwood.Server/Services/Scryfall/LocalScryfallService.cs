using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models.Scryfall;

namespace Quartzwood.Server.Services.Scryfall;

// Answers Scryfall lookups from the local scryfall.db (filled by ScryfallBulkImporter).
// Only when it has no answer does it ask the live API: e.g. before the first import finishes,
// or for a card released since the last import. Offline, that fallback just returns "not found"
public class LocalScryfallService : IScryfallService
{
    // Layouts Scryfall leaves out of searches unless "include:extras" is used
    private static readonly string[] ExtraLayouts = ["token", "double_faced_token", "emblem", "art_series"];

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
        return local.Count > 0
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
        return local.Count > 0
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
