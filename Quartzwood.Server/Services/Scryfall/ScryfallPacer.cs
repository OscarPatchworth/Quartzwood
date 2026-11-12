using System.Net;

namespace Quartzwood.Server.Services.Scryfall;

// Keeps Quartzwood polite to Scryfall, however many cards an import or a page asks about at once:
//  - the API (api.scryfall.com): one request at a time, at least 100 ms apart (Scryfall asks for 50-100 ms
//    between requests, and answers 429 Too Many Requests, then blocks, if you go faster)
//  - images (cards.scryfall.io): a few downloads at a time instead of one per card on the page
//  - if Scryfall can't be reached, or answers 429 / 503 (busy, or down for maintenance), every Scryfall request
//    pauses for a while (Scryfall's Retry-After if it gives one) instead of retrying straight away. While paused,
//    requests fail at once with ScryfallPausedException, without touching the network
//
// Registered as a Singleton: the limits only work if every request shares them
public class ScryfallPacer
{
    private static readonly TimeSpan ApiSpacing = TimeSpan.FromMilliseconds(100);
    private const int MaxImageDownloads = 4;
    private static readonly TimeSpan DefaultPause = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan MaxPause = TimeSpan.FromMinutes(30);

    private readonly ILogger<ScryfallPacer> _logger;
    private readonly SemaphoreSlim _api = new(1, 1);
    private readonly SemaphoreSlim _images = new(MaxImageDownloads, MaxImageDownloads);
    // Only read and written while holding _api, so no lock of its own
    private DateTime _nextApiRequestAt = DateTime.MinValue;
    // UTC ticks; Interlocked because any request can set it
    private long _pausedUntilTicks;

    public ScryfallPacer(ILogger<ScryfallPacer> logger)
    {
        _logger = logger;
    }

    // When requests start again; null = not paused
    public DateTime? PausedUntil
    {
        get
        {
            var until = new DateTime(Interlocked.Read(ref _pausedUntilTicks), DateTimeKind.Utc);
            return until > DateTime.UtcNow ? until : null;
        }
    }

    public async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send, CancellationToken ct)
    {
        ThrowIfPaused();
        var isApi = request.RequestUri?.Host == "api.scryfall.com";
        var gate = isApi ? _api : _images;

        await gate.WaitAsync(ct);
        try
        {
            // The pause may have started while this request waited its turn
            ThrowIfPaused();
            if (isApi)
            {
                var wait = _nextApiRequestAt - DateTime.UtcNow;
                if (wait > TimeSpan.Zero) await Task.Delay(wait, ct);
                _nextApiRequestAt = DateTime.UtcNow + ApiSpacing;
            }

            HttpResponseMessage response;
            try
            {
                response = await send(request, ct);
            }
            catch (HttpRequestException ex)
            {
                Pause(null, $"couldn't reach {request.RequestUri?.Host} ({ex.Message})");
                throw;
            }

            if (response.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable)
                Pause(response.Headers.RetryAfter?.Delta, $"{request.RequestUri?.Host} answered {(int)response.StatusCode}");
            return response;
        }
        finally
        {
            gate.Release();
        }
    }

    private void ThrowIfPaused()
    {
        if (PausedUntil is { } until) throw new ScryfallPausedException(until);
    }

    private void Pause(TimeSpan? retryAfter, string reason)
    {
        var length = retryAfter is { } delta && delta > TimeSpan.Zero ? (delta < MaxPause ? delta : MaxPause) : DefaultPause;
        var until = DateTime.UtcNow + length;
        var previous = Interlocked.Exchange(ref _pausedUntilTicks, until.Ticks);
        // Several requests usually fail together: log the first one only
        if (new DateTime(previous, DateTimeKind.Utc) < DateTime.UtcNow)
            _logger.LogWarning("Scryfall {Reason}: pausing requests to Scryfall until {Until:T} (local time)", reason, until.ToLocalTime());
    }
}

// A Scryfall request that wasn't sent because requests are paused (see ScryfallPacer).
// An HttpRequestException, so everything that already copes with "Scryfall unreachable" copes with this too
public class ScryfallPausedException(DateTime pausedUntil)
    : HttpRequestException($"Requests to Scryfall are paused until {pausedUntil.ToLocalTime():T} after errors from Scryfall.")
{
    public DateTime PausedUntil { get; } = pausedUntil;
}

// Put in front of an HttpClient (AddHttpMessageHandler) so all its requests go through the pacer
public class ScryfallPacingHandler(ScryfallPacer pacer) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        => pacer.SendAsync(request, base.SendAsync, ct);
}
