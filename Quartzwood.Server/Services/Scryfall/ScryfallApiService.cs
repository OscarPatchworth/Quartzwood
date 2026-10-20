using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using System.Linq;


namespace Quartzwood.Server.Services.Scryfall;

// Talks to the live Scryfall API. Used by LocalScryfallService as the fallback
// when scryfall.db doesn't have an answer (not imported yet, or a card newer than the last import)
public class ScryfallApiService : IScryfallService
{
    private readonly HttpClient _http;

    public ScryfallApiService(HttpClient http)
    {
        _http = http;
    }

    // https://scryfall.com/docs/api/cards/autocomplete: up to 20 names
    public async Task<List<string>> AutocompleteAsync(string text, int limit)
    {
        var url = $"https://api.scryfall.com/cards/autocomplete?q={Uri.EscapeDataString(text)}";
        var response = await _http.GetFromJsonAsync<AutocompleteResponse>(url);
        return response?.data.Take(limit).ToList() ?? [];
    }

    private record AutocompleteResponse(List<string> data);

    // Not used for bulk lookups: one request per id would be slow and heavy on the API.
    // Import/export fall back to the card's own set/number when the local data doesn't have an id
    public Task<Dictionary<string, ScryfallCard>> GetCardsByIdsAsync(IEnumerable<string> scryfallIds)
        => Task.FromResult(new Dictionary<string, ScryfallCard>());

    // Not worth one API call per card: sorting just puts cards without data last
    public Task<Dictionary<string, ScryfallGameplay>> GetGameplayByIdsAsync(IEnumerable<string> scryfallIds)
        => Task.FromResult(new Dictionary<string, ScryfallGameplay>());

    // No request needed: this API URL redirects to the image (it does count as an API call when loaded)
    public Task<string?> GetImageUrlAsync(string scryfallId, string size)
        => Task.FromResult<string?>(
            $"https://api.scryfall.com/cards/{Uri.EscapeDataString(scryfallId)}?format=image&version={size}");

public async Task<ScryfallCard?> GetCardAsync(string setCode, string setNumber)
{
    var url = $"https://api.scryfall.com/cards/{setCode.ToLower()}/{setNumber}";
    Console.WriteLine($"Scryfall request: {url}");
    
    var response = await _http.GetAsync(url);
    Console.WriteLine($"Scryfall response: {response.StatusCode}");

    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Scryfall error body: {error}");
        return null;
    }

    var json = await response.Content.ReadFromJsonAsync<ScryfallResponse>();
    Console.WriteLine($"Scryfall parsed: {json?.name}");
    
    if (json is null) return null;
    return new ScryfallCard(json.id, json.name, json.set, json.collector_number);
}

public async Task<IEnumerable<ScryfallCard>?> SearchAsync(string name, int? year)
{
    var query = $"!\"{name}\"";
    if (year.HasValue) query += $" year={year}";
    query += " include:extras (game:paper)";

    string? url = $"https://api.scryfall.com/cards/search?q={Uri.EscapeDataString(query)}&unique=prints&order=released";
    var cards = new List<ScryfallCard>();

    while (url is not null)
    {
        Console.WriteLine($"Scryfall search: {url}");
        var response = await _http.GetAsync(url);
        Console.WriteLine($"Scryfall response: {response.StatusCode}");

        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadFromJsonAsync<ScryfallSearchResponse>();
        if (json is null) return null;

        cards.AddRange(json.data.Select(c => new ScryfallCard(c.id, c.name, c.set, c.collector_number)));
        url = json.has_more ? json.next_page : null;
    }

    return cards;
}

public Task<ScryfallCard?> GetPrintingAsync(string setCode, string setNumber, string stampType, bool isList)
    {
        var (scryfallSetCode, scryfallSetNumber) = ScryfallPrintingKey.Resolve(setCode, setNumber, stampType, isList);
        return GetCardAsync(scryfallSetCode, scryfallSetNumber);
    }

public async Task<IEnumerable<ScryfallCard>?> SearchPromoAsync(string? cardName, int? year, string? setNumber)
{
    var query = "is:promo not:prerelease not:stamped -set:PRM";
    if(cardName != null && !cardName.IsWhiteSpace()){ query += $" !\"{cardName}\"";}
    if(setNumber != null && !setNumber.IsWhiteSpace() && setNumber.All(char.IsDigit)){ query += $" cn:{setNumber}";}
    if (year.HasValue) query += $" year={year}";

    string? url = $"https://api.scryfall.com/cards/search?q={Uri.EscapeDataString(query)}&unique=prints&order=released";
    var cards = new List<ScryfallCard>();

    while (url is not null)
    {
        Console.WriteLine($"Scryfall search: {url}");
        var response = await _http.GetAsync(url);
        Console.WriteLine($"Scryfall response: {response.StatusCode}");

        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadFromJsonAsync<ScryfallSearchResponse>();
        if (json is null) return null;

        cards.AddRange(json.data.Select(c => new ScryfallCard(c.id, c.name, c.set, c.collector_number)));
        url = json.has_more ? json.next_page : null;
    }

    return cards;
}


    private record ScryfallResponse(string id, string name, string set, string collector_number);
    private record ScryfallSearchResponse(IEnumerable<ScryfallResponse> data, bool has_more, string? next_page);
}