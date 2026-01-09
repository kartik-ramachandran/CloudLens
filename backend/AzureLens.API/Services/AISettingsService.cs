using AzureLens.API.Data;
using AzureLens.API.Data.Entities;
using AzureLens.API.Models;
using Microsoft.EntityFrameworkCore;

namespace AzureLens.API.Services;

public interface IAISettingsService
{
    Task<AISettingsResponse> GetSettingsAsync();
    Task<AISettingsResponse> SaveSettingsAsync(AISettingsDto settings);
    Task<AISettings> GetOrCreateSettingsAsync();
}

public class AISettingsService : IAISettingsService
{
    private readonly AppDbContext _context;
    private readonly ILogger<AISettingsService> _logger;

    public AISettingsService(AppDbContext context, ILogger<AISettingsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AISettingsResponse> GetSettingsAsync()
    {
        var settings = await _context.AISettings.FirstOrDefaultAsync();
        
        if (settings == null)
        {
            return new AISettingsResponse
            {
                Provider = "OpenAI",
                Model = "gpt-4o",
                MaxTokens = 2000,
                Temperature = 0.7,
                IsConfigured = false
            };
        }

        return new AISettingsResponse
        {
            Provider = settings.Provider,
            Model = settings.Model,
            Endpoint = settings.Endpoint,
            MaxTokens = settings.MaxTokens,
            Temperature = settings.Temperature,
            IsConfigured = !string.IsNullOrEmpty(settings.ApiKey)
        };
    }

    public async Task<AISettingsResponse> SaveSettingsAsync(AISettingsDto dto)
    {
        var settings = await _context.AISettings.FirstOrDefaultAsync();

        if (settings == null)
        {
            settings = new AISettings();
            _context.AISettings.Add(settings);
        }

        settings.Provider = dto.Provider;
        settings.ApiKey = dto.ApiKey;
        settings.Model = dto.Model;
        settings.Endpoint = dto.Endpoint;
        settings.MaxTokens = dto.MaxTokens;
        settings.Temperature = dto.Temperature;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation($"AI settings saved: Provider={dto.Provider}, Model={dto.Model}");

        return new AISettingsResponse
        {
            Provider = settings.Provider,
            Model = settings.Model,
            Endpoint = settings.Endpoint,
            MaxTokens = settings.MaxTokens,
            Temperature = settings.Temperature,
            IsConfigured = !string.IsNullOrEmpty(settings.ApiKey)
        };
    }

    public async Task<AISettings> GetOrCreateSettingsAsync()
    {
        var settings = await _context.AISettings.FirstOrDefaultAsync();
        
        if (settings == null)
        {
            settings = new AISettings
            {
                Provider = "OpenAI",
                Model = "gpt-4o",
                MaxTokens = 2000,
                Temperature = 0.7,
                UpdatedAt = DateTime.UtcNow
            };
            _context.AISettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return settings;
    }
}
