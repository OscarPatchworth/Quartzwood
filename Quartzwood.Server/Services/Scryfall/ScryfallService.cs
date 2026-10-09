using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using System.Linq;


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

public interface IScryfallService
{
    Task<ScryfallCard?> GetCardAsync(string setCode, string setNumber);
    Task<IEnumerable<ScryfallCard>?> SearchAsync(string name, int? year);
    Task<string?> GetScryfallId(string setCode, string setNumber, string stampType, string? cardName);
    Task<IEnumerable<ScryfallCard>?> SearchPromoAsync(string? cardName, int? year, string? setNumber);
}

public class ScryfallService : IScryfallService
{
    private readonly HttpClient _http;

    public ScryfallService(HttpClient http)
    {
        _http = http;
    }

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
    query += " include:extras";

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

public async Task<string?> GetScryfallId(string setCode, string setNumber, string? stampType, string? cardName)
    {

        var scryfallSetCode = setCode;
        var scryfallSetNumber = setNumber;

        // Scryfall alters setCodes of:
        // 1| Stamped cards: planeswalker & pre-release
        // 2| Event Promo cards i.e. Japan Standard Cup: PRM => PJSC

        switch (stampType){
            case nameof(StampType.None):
                break;
            case nameof(StampType.Promo):
                scryfallSetCode = "p" + scryfallSetCode;
                scryfallSetNumber = scryfallSetNumber + "p";
                break;
            case nameof(StampType.Prerelease):
                scryfallSetCode = "p" + scryfallSetCode;
                scryfallSetNumber = scryfallSetNumber + "s";
                break;
            default:    // If null
                break;                      
        }

        var responce = await GetCardAsync(scryfallSetCode, scryfallSetNumber);
        return responce?.Id;
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