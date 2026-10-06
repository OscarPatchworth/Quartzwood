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

    var url = $"https://api.scryfall.com/cards/search?q={Uri.EscapeDataString(query)}";
    Console.WriteLine($"Scryfall search: {url}");
    
    var response = await _http.GetAsync(url);
    Console.WriteLine($"Scryfall response: {response.StatusCode}");

    if (!response.IsSuccessStatusCode) {return null;}

    var json = await response.Content.ReadFromJsonAsync<ScryfallSearchResponse>();
    if (json is null) return null;
    
    return json.data.Select(c => new ScryfallCard(c.id, c.name, c.set, c.collector_number));
}

    private record ScryfallResponse(string id, string name, string set, string collector_number);
    private record ScryfallSearchResponse(IEnumerable<ScryfallResponse> data);
}