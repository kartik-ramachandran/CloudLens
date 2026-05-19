using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace CloudLens.CacheService;

/// <summary>
/// Singleton that holds all active SSE client channels and broadcasts events to them.
/// </summary>
public class SseBroadcaster
{
    private readonly ConcurrentDictionary<Guid, Channel> _clients = new();

    public IDisposable Subscribe(HttpResponse response)
    {
        var id = Guid.NewGuid();
        var channel = new Channel(id, response, () => _clients.TryRemove(id, out _));
        _clients[id] = channel;
        return channel;
    }

    public async Task BroadcastAsync(CacheEvent evt, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(evt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        var data = $"data: {json}\n\n";
        var bytes = Encoding.UTF8.GetBytes(data);

        var dead = new List<Guid>();
        foreach (var (id, channel) in _clients)
        {
            try
            {
                await channel.Response.Body.WriteAsync(bytes, ct);
                await channel.Response.Body.FlushAsync(ct);
            }
            catch
            {
                dead.Add(id);
            }
        }

        foreach (var id in dead)
            _clients.TryRemove(id, out _);
    }

    public int ClientCount => _clients.Count;

    private sealed class Channel : IDisposable
    {
        private readonly Action _onDispose;
        public HttpResponse Response { get; }
        public Channel(Guid id, HttpResponse response, Action onDispose)
        {
            Response = response;
            _onDispose = onDispose;
        }
        public void Dispose() => _onDispose();
    }
}

public record CacheEvent(
    string Type,          // refresh_started | refresh_complete | refresh_error | cleanup_complete | heartbeat
    string? Provider,     // azure | aws | gcp | all | null
    string? Message,
    long? DurationMs,
    DateTime Timestamp
)
{
    public static CacheEvent Started(string provider) =>
        new("refresh_started", provider, null, null, DateTime.UtcNow);

    public static CacheEvent Complete(string provider, long ms) =>
        new("refresh_complete", provider, null, ms, DateTime.UtcNow);

    public static CacheEvent Error(string provider, string message) =>
        new("refresh_error", provider, message, null, DateTime.UtcNow);

    public static CacheEvent CleanupComplete(string message) =>
        new("cleanup_complete", null, message, null, DateTime.UtcNow);

    public static CacheEvent Heartbeat() =>
        new("heartbeat", null, null, null, DateTime.UtcNow);
}
