using System.Text.Json;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public interface IChatSessionStore
{
    Task<List<ChatSessionSummary>> GetSessionsAsync(string userId);
    Task<List<ChatMessageDto>> GetMessagesAsync(string userId, string sessionId);
    Task<StoredChatSession> GetOrCreateSessionAsync(string userId, string? sessionId, string titleSeed);
    Task RenameSessionAsync(string userId, string sessionId, string title);
    Task DeleteSessionAsync(string userId, string sessionId);
    Task AppendMessageAsync(string userId, string sessionId, string role, string content);
}

public class FileChatSessionStore : IChatSessionStore
{
    private readonly string _storePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public FileChatSessionStore(IWebHostEnvironment env, IConfiguration configuration)
    {
        var configured = configuration["Chat:StorePath"];
        _storePath = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "App_Data", "chat-sessions.json")
            : configured;
    }

    public async Task<List<ChatSessionSummary>> GetSessionsAsync(string userId)
    {
        await _lock.WaitAsync();
        try
        {
            var sessions = await ReadAllAsync();
            return sessions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new ChatSessionSummary
                {
                    SessionId = s.SessionId,
                    Title = s.Title,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt,
                    MessageCount = s.Messages.Count
                })
                .ToList();
        }
        finally { _lock.Release(); }
    }

    public async Task<List<ChatMessageDto>> GetMessagesAsync(string userId, string sessionId)
    {
        await _lock.WaitAsync();
        try
        {
            var session = (await ReadAllAsync()).FirstOrDefault(s => s.UserId == userId && s.SessionId == sessionId);
            return session?.Messages.OrderBy(m => m.CreatedAt).ToList() ?? new List<ChatMessageDto>();
        }
        finally { _lock.Release(); }
    }

    public async Task<StoredChatSession> GetOrCreateSessionAsync(string userId, string? sessionId, string titleSeed)
    {
        await _lock.WaitAsync();
        try
        {
            var sessions = await ReadAllAsync();
            var session = !string.IsNullOrWhiteSpace(sessionId)
                ? sessions.FirstOrDefault(s => s.UserId == userId && s.SessionId == sessionId)
                : null;

            if (session != null)
                return session;

            session = new StoredChatSession
            {
                SessionId = Guid.NewGuid().ToString("N"),
                UserId = userId,
                Title = TruncateTitle(titleSeed),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            sessions.Add(session);
            await WriteAllAsync(sessions);
            return session;
        }
        finally { _lock.Release(); }
    }

    public async Task RenameSessionAsync(string userId, string sessionId, string title)
    {
        await _lock.WaitAsync();
        try
        {
            var sessions = await ReadAllAsync();
            var session = sessions.FirstOrDefault(s => s.UserId == userId && s.SessionId == sessionId);
            if (session == null) return;
            session.Title = TruncateTitle(title);
            session.UpdatedAt = DateTime.UtcNow;
            await WriteAllAsync(sessions);
        }
        finally { _lock.Release(); }
    }

    public async Task DeleteSessionAsync(string userId, string sessionId)
    {
        await _lock.WaitAsync();
        try
        {
            var sessions = await ReadAllAsync();
            sessions.RemoveAll(s => s.UserId == userId && s.SessionId == sessionId);
            await WriteAllAsync(sessions);
        }
        finally { _lock.Release(); }
    }

    public async Task AppendMessageAsync(string userId, string sessionId, string role, string content)
    {
        await _lock.WaitAsync();
        try
        {
            var sessions = await ReadAllAsync();
            var session = sessions.FirstOrDefault(s => s.UserId == userId && s.SessionId == sessionId);
            if (session == null) return;
            session.Messages.Add(new ChatMessageDto
            {
                Role = role,
                Content = content,
                CreatedAt = DateTime.UtcNow
            });
            session.UpdatedAt = DateTime.UtcNow;
            await WriteAllAsync(sessions);
        }
        finally { _lock.Release(); }
    }

    private async Task<List<StoredChatSession>> ReadAllAsync()
    {
        if (!File.Exists(_storePath))
            return new List<StoredChatSession>();

        await using var stream = File.OpenRead(_storePath);
        return await JsonSerializer.DeserializeAsync<List<StoredChatSession>>(stream) ?? new List<StoredChatSession>();
    }

    private async Task WriteAllAsync(List<StoredChatSession> sessions)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_storePath)!);
        await using var stream = File.Create(_storePath);
        await JsonSerializer.SerializeAsync(stream, sessions, JsonOptions);
    }

    private static string TruncateTitle(string title)
    {
        var clean = string.Join(' ', (title ?? "New chat").Split(default(string[]), StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrWhiteSpace(clean)) clean = "New chat";
        return clean.Length <= 64 ? clean : $"{clean[..61]}...";
    }
}
