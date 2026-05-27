using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CloudLens.API.Models;
using CloudLens.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private const string SystemPrompt = """
        You are CloudLens Assistant, a senior Azure, multi-cloud, FinOps, security, and compliance advisor built into CloudLens.
        Help users reason about cloud inventory, cost, security posture, SOC 2 readiness, access reviews, vulnerabilities, network exposure, remediation, and operational risk.
        Be concise, specific, and action-oriented. Prefer clear Markdown with short sections, bullets, and commands when useful.
        If a user asks for a cloud change, explain risk and verification steps. Do not invent live environment data that was not supplied in the conversation.
        """;

    private readonly IAIService _aiService;
    private readonly IChatSessionStore _store;
    private readonly ILogger<ChatController> _logger;

    public ChatController(IAIService aiService, IChatSessionStore store, ILogger<ChatController> logger)
    {
        _aiService = aiService;
        _store = store;
        _logger = logger;
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        return Ok(await _store.GetSessionsAsync(GetUserId()));
    }

    [HttpGet("sessions/{sessionId}/messages")]
    public async Task<IActionResult> GetMessages(string sessionId)
    {
        return Ok(await _store.GetMessagesAsync(GetUserId(), sessionId));
    }

    [HttpPatch("sessions/{sessionId}/title")]
    public async Task<IActionResult> RenameSession(string sessionId, [FromBody] RenameChatSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "Title is required." });

        await _store.RenameSessionAsync(GetUserId(), sessionId, request.Title);
        return Ok();
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> DeleteSession(string sessionId)
    {
        await _store.DeleteSessionAsync(GetUserId(), sessionId);
        return NoContent();
    }

    [HttpPost("send")]
    public async Task Send(
        [FromForm] string? sessionId,
        [FromForm] string? message,
        [FromForm] string? history,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        var userId = GetUserId();
        var cleanMessage = message?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanMessage) && file == null)
        {
            await WriteSseAsync(new { error = "Message or file is required." }, cancellationToken);
            return;
        }

        string? fileContext = null;
        if (file != null)
            fileContext = await ReadFileContextAsync(file, cancellationToken);

        var titleSeed = string.IsNullOrWhiteSpace(cleanMessage) ? file?.FileName ?? "New chat" : cleanMessage;
        var session = await _store.GetOrCreateSessionAsync(userId, sessionId, titleSeed);
        Response.Headers["X-Session-Id"] = session.SessionId;
        Response.Headers.Append("Access-Control-Expose-Headers", "X-Session-Id");

        var userContent = fileContext == null
            ? cleanMessage
            : $"{cleanMessage}\n\nAttached file: {file!.FileName}\n\n{fileContext}".Trim();

        await _store.AppendMessageAsync(userId, session.SessionId, "user", file == null ? cleanMessage : $"{cleanMessage}\n\nAttached file: {file.FileName}".Trim());

        try
        {
            var promptMessages = BuildPromptMessages(history, session.Messages, userContent);
            var reply = await _aiService.GenerateChatResponseAsync(promptMessages, SystemPrompt, cancellationToken);
            if (string.IsNullOrWhiteSpace(reply))
                reply = "I could not generate a response from the configured AI provider.";

            await _store.AppendMessageAsync(userId, session.SessionId, "assistant", reply);

            foreach (var chunk in Chunk(reply, 24))
            {
                await WriteSseAsync(new { content = chunk }, cancellationToken);
                await Task.Delay(18, cancellationToken);
            }

            await Response.WriteAsync("data: [DONE]\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Chat stream cancelled for session {SessionId}", session.SessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat send failed for session {SessionId}", session.SessionId);
            await WriteSseAsync(new { error = ex.Message }, CancellationToken.None);
        }
    }

    private static List<ChatExchange> BuildPromptMessages(string? historyJson, List<ChatMessageDto> storedMessages, string userContent)
    {
        var messages = new List<ChatExchange>();

        if (!string.IsNullOrWhiteSpace(historyJson))
        {
            try
            {
                var history = JsonSerializer.Deserialize<List<ChatMessageDto>>(historyJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (history != null)
                    messages.AddRange(history.TakeLast(16).Select(m => new ChatExchange(m.Role, m.Content)));
            }
            catch { /* use stored history fallback */ }
        }

        if (!messages.Any())
            messages.AddRange(storedMessages.TakeLast(16).Select(m => new ChatExchange(m.Role, m.Content)));

        messages.Add(new ChatExchange("user", userContent));
        return messages;
    }

    private async Task<string> ReadFileContextAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length > 1024 * 1024)
            return $"File {file.FileName} is larger than the 1 MB direct-chat preview limit. Ask targeted questions after extracting key sections.";

        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var text = await reader.ReadToEndAsync(cancellationToken);
        if (text.Length > 12000)
            text = text[..12000] + "\n\n[File preview truncated.]";
        return text;
    }

    private async Task WriteSseAsync(object payload, CancellationToken cancellationToken)
    {
        await Response.WriteAsync($"data: {JsonSerializer.Serialize(payload)}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(ClaimTypes.Email)
            ?? User.Identity?.Name
            ?? "default";
    }

    private static IEnumerable<string> Chunk(string text, int size)
    {
        for (var i = 0; i < text.Length; i += size)
            yield return text.Substring(i, Math.Min(size, text.Length - i));
    }
}
