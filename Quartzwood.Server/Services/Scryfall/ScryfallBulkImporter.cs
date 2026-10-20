using System.Globalization;
using System.IO.Compression;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models.Scryfall;

namespace Quartzwood.Server.Services.Scryfall;

// Runs in the background for as long as the server is up. Once a day it checks whether the local
// Scryfall copy is older than Scryfall:RefreshDays; if so it downloads Scryfall's "default_cards"
// bulk file (every printing, English where available) and replaces the contents of scryfall.db.
// The app keeps working during an import: lookups fall back to the API until data exists,
// and while a refresh runs, readers keep seeing the old data until the new data is committed
public class ScryfallBulkImporter : BackgroundService
{
    public const string HttpClientName = "ScryfallBulk";
    // Bump this when the importer starts keeping a new field: the next check re-imports straight away
    // instead of waiting up to RefreshDays for the new columns to be filled.
    // 2 = mana value, mana cost, colours, colour identity, type line
    // 3 = USD prices
    public const int DataVersion = 3;

    private const string BulkInfoUrl = "https://api.scryfall.com/bulk-data/default-cards";
    // How often to check whether a refresh is due (cheap: one small request at most). Hourly, so a daily
    // refresh happens within an hour of being due (a 24h check could just miss it and wait another day)
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);
    // Retry sooner while there's no local data at all (e.g. the server started offline)
    private static readonly TimeSpan RetryWithoutData = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopes;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ScryfallOptions _options;
    private readonly ILogger<ScryfallBulkImporter> _logger;

    public ScryfallBulkImporter(IServiceScopeFactory scopes, IHttpClientFactory httpFactory,
        IOptions<ScryfallOptions> options, ILogger<ScryfallBulkImporter> logger)
    {
        _scopes = scopes;
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var hasData = false;
            try
            {
                hasData = await ImportIfDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                // Network down, Scryfall unavailable, bad file...: keep the current data and try again later
                _logger.LogWarning(ex, "Scryfall bulk import failed, keeping existing data");
            }

            try
            {
                await Task.Delay(hasData ? CheckInterval : RetryWithoutData, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    // Returns whether scryfall.db has data afterwards
    private async Task<bool> ImportIfDueAsync(CancellationToken ct)
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ScryfallDbContext>();

        var state = await db.ImportState.FindAsync([1], ct);
        if (state is null)
        {
            state = new ScryfallImportState();
            db.ImportState.Add(state);
        }

        var hasData = state.CardCount > 0;
        var isCurrentVersion = state.DataVersion >= DataVersion;
        if (hasData && isCurrentVersion && state.ImportedAt is not null
            && DateTimeOffset.UtcNow - state.ImportedAt < TimeSpan.FromDays(_options.RefreshDays))
        {
            return true;
        }

        var http = _httpFactory.CreateClient(HttpClientName);
        var bulk = await http.GetFromJsonAsync<BulkDataInfo>(BulkInfoUrl, ct)
            ?? throw new InvalidOperationException("Empty bulk-data response from Scryfall.");

        // Scryfall hasn't published anything newer than what we have: just restart the clock
        if (hasData && isCurrentVersion && state.BulkUpdatedAt is not null && bulk.updated_at <= state.BulkUpdatedAt)
        {
            _logger.LogInformation("Scryfall data is already the latest ({UpdatedAt})", bulk.updated_at);
            state.ImportedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return true;
        }

        _logger.LogInformation("Downloading Scryfall bulk data ({UpdatedAt}) from {Url}", bulk.updated_at, bulk.jsonl_download_uri);
        var count = await ReplacePrintingsAsync(db, http, bulk.jsonl_download_uri, ct);

        state.BulkUpdatedAt = bulk.updated_at;
        state.ImportedAt = DateTimeOffset.UtcNow;
        state.CardCount = count;
        state.DataVersion = DataVersion;
        await db.SaveChangesAsync(ct);

        _logger.LogInformation("Scryfall import finished: {Count} printings", count);
        return count > 0;
    }

    // Streams the gzipped JSON Lines file (one card per line) straight into the table,
    // so the ~80MB download / ~500MB of JSON is never held in memory at once
    private static async Task<int> ReplacePrintingsAsync(ScryfallDbContext db, HttpClient http, string url, CancellationToken ct)
    {
        using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        await using var download = await response.Content.ReadAsStreamAsync(ct);
        await using var unzipped = new GZipStream(download, CompressionMode.Decompress);
        using var reader = new StreamReader(unzipped);

        // Plain ADO.NET rather than EF entities: ~100k inserts with one reused, prepared command
        // takes seconds, where tracking 100k EF entities would take minutes
        var connection = (SqliteConnection)db.Database.GetDbConnection();
        await connection.OpenAsync(ct);
        await using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync(ct);

        await using (var clear = connection.CreateCommand())
        {
            clear.Transaction = transaction;
            clear.CommandText = "DELETE FROM Printings";
            await clear.ExecuteNonQueryAsync(ct);
        }

        await using var insert = connection.CreateCommand();
        insert.Transaction = transaction;
        insert.CommandText = """
            INSERT OR REPLACE INTO Printings
                (Id, Name, FrontFaceName, SetCode, SetType, CollectorNumber, Lang, ReleasedAt,
                 IsPaper, IsPromo, PromoTypes, Layout, ImageSmall, ImageNormal,
                 ManaValue, ManaCost, Colors, ColorIdentity, TypeLine,
                 PriceUsd, PriceUsdFoil, PriceUsdEtched)
            VALUES
                ($id, $name, $front, $set, $setType, $number, $lang, $released,
                 $paper, $promo, $promoTypes, $layout, $small, $normal,
                 $manaValue, $manaCost, $colors, $colorIdentity, $typeLine,
                 $priceUsd, $priceUsdFoil, $priceUsdEtched)
            """;
        var parameters = new[] { "$id", "$name", "$front", "$set", "$setType", "$number", "$lang", "$released",
                                 "$paper", "$promo", "$promoTypes", "$layout", "$small", "$normal",
                                 "$manaValue", "$manaCost", "$colors", "$colorIdentity", "$typeLine",
                                 "$priceUsd", "$priceUsdFoil", "$priceUsdEtched" }
            .Select(name => insert.Parameters.Add(new SqliteParameter { ParameterName = name }))
            .ToArray();
        insert.Prepare();

        var count = 0;
        while (await reader.ReadLineAsync(ct) is { } line)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var card = JsonSerializer.Deserialize<BulkCard>(line);
            if (card is null) continue;

            // Double-faced cards keep their images (and colours, mana cost) on the faces instead of the card
            var front = card.card_faces?.FirstOrDefault();
            var images = card.image_uris ?? front?.image_uris;
            object?[] values =
            [
                card.id,
                card.name,
                front?.name,
                card.set,
                card.set_type,
                card.collector_number,
                card.lang,
                card.released_at,   // already "yyyy-MM-dd", the format EF uses for DateOnly
                card.games?.Contains("paper") == true,
                card.promo,
                card.promo_types is { Length: > 0 } ? $",{string.Join(",", card.promo_types)}," : null,
                card.layout,
                images?.small,
                images?.normal,
                // Reversible cards (e.g. "Sol Ring // Sol Ring") have these on the faces only
                card.cmc ?? front?.cmc,
                card.mana_cost ?? front?.mana_cost,
                ToWubrg(card.colors ?? front?.colors),
                ToWubrg(card.color_identity),
                card.type_line ?? front?.type_line,
                ParsePrice(card.prices?.usd),
                ParsePrice(card.prices?.usd_foil),
                ParsePrice(card.prices?.usd_etched),
            ];
            for (var i = 0; i < values.Length; i++)
                parameters[i].Value = values[i] ?? DBNull.Value;

            await insert.ExecuteNonQueryAsync(ct);
            count++;
        }

        await transaction.CommitAsync(ct);
        return count;
    }

    // ["R", "U"] -> "UR": always in WUBRG order, so equal colour sets are equal strings. [] -> "" (colourless)
    private static string? ToWubrg(string[]? colors)
        => colors is null ? null : string.Concat("WUBRG".Where(letter => colors.Contains(letter.ToString())));

    // Scryfall sends prices as text ("0.25"); invariant culture so "." is the decimal point on every machine
    private static decimal? ParsePrice(string? price)
        => decimal.TryParse(price, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;

    // Only the fields we keep; System.Text.Json ignores the rest of each (large) card object
    private record BulkDataInfo(DateTimeOffset updated_at, string jsonl_download_uri);
    private record BulkPrices(string? usd, string? usd_foil, string? usd_etched);
    private record BulkImageUris(string? small, string? normal);
    private record BulkCardFace(string? name, BulkImageUris? image_uris, string? mana_cost, string[]? colors,
        string? type_line, double? cmc);
    private record BulkCard(
        string id,
        string name,
        string set,
        string? set_type,
        string collector_number,
        string? lang,
        string? released_at,
        string[]? games,
        bool promo,
        string[]? promo_types,
        string? layout,
        BulkImageUris? image_uris,
        BulkCardFace[]? card_faces,
        double? cmc,
        string? mana_cost,
        string[]? colors,
        string[]? color_identity,
        string? type_line,
        BulkPrices? prices
    );
}
