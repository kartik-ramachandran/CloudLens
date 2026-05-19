using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using CloudLens.API.Data;
using CloudLens.API.Models;

namespace CloudLens.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext context, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(bool Success, User? User, string? Error)> AuthenticateWithSsoAsync(string provider, string idToken)
    {
        try
        {
            // Validate and decode the ID token based on provider
            var (isValid, providerId, email, name, profilePictureUrl) = await ValidateIdTokenAsync(provider, idToken);
            
            if (!isValid)
            {
                return (false, null, "Invalid SSO token");
            }

            // Get or create user
            var user = await GetOrCreateUserAsync(provider, providerId, email, name, profilePictureUrl);
            
            if (user == null || !user.IsActive)
            {
                return (false, null, "User account is disabled");
            }

            // Update last login
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
            if (userEntity != null)
            {
                userEntity.LastLoginAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return (true, user, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error authenticating user with SSO");
            return (false, null, $"Authentication error: {ex.Message}");
        }
    }

    public async Task<(bool Success, User? User, string? Error)> RegisterWithEmailAsync(string email, string password, string name, string? organizationName = null)
    {
        try
        {
            email = email.Trim().ToLowerInvariant();

            if (await _context.Users.AnyAsync(u => u.Email == email))
                return (false, null, "An account with this email already exists.");

            var hasher = new PasswordHasher<Data.Entities.UserEntity>();
            var entity = new Data.Entities.UserEntity
            {
                Email = email,
                Name = name.Trim(),
                Provider = "email",
                ProviderId = email,
                Role = 1, // Viewer
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow,
                OrganizationName = organizationName?.Trim(),
            };
            entity.PasswordHash = hasher.HashPassword(entity, password);

            _context.Users.Add(entity);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Registered new email user: {Email}", email);
            return (true, MapToUser(entity), null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering email user");
            return (false, null, $"Registration error: {ex.Message}");
        }
    }

    public async Task<(bool Success, User? User, string? Error)> LoginWithEmailAsync(string email, string password)
    {
        try
        {
            email = email.Trim().ToLowerInvariant();
            var entity = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.Provider == "email");

            if (entity == null)
                return (false, null, "Invalid email or password.");

            if (!entity.IsActive)
                return (false, null, "This account has been disabled.");

            if (string.IsNullOrEmpty(entity.PasswordHash))
                return (false, null, "This account uses SSO — please sign in with your identity provider.");

            var hasher = new PasswordHasher<Data.Entities.UserEntity>();
            var result = hasher.VerifyHashedPassword(entity, entity.PasswordHash, password);

            if (result == PasswordVerificationResult.Failed)
                return (false, null, "Invalid email or password.");

            // Rehash if needed
            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                entity.PasswordHash = hasher.HashPassword(entity, password);
            }

            entity.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return (true, MapToUser(entity), null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during email login");
            return (false, null, $"Login error: {ex.Message}");
        }
    }

    public string GenerateJwtToken(User user)
    {
        var secretKey = _configuration["Jwt:Secret"] ?? "your-super-secret-key-change-this-in-production-min-32-chars";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("Provider", user.Provider)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "CloudLens",
            audience: _configuration["Jwt:Audience"] ?? "CloudLens",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7), // 7-day token validity
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        return userEntity != null ? MapToUser(userEntity) : null;
    }

    public async Task<User?> GetOrCreateUserAsync(string provider, string providerId, string email, string name, string? profilePictureUrl = null)
    {
        // Try to find existing user by provider + providerId
        var userEntity = await _context.Users.FirstOrDefaultAsync(u => 
            u.Provider == provider && u.ProviderId == providerId);

        if (userEntity != null)
        {
            // Update name and profile picture if changed
            if (userEntity.Name != name || userEntity.ProfilePictureUrl != profilePictureUrl)
            {
                userEntity.Name = name;
                userEntity.ProfilePictureUrl = profilePictureUrl;
                await _context.SaveChangesAsync();
            }
            
            return MapToUser(userEntity);
        }

        // Create new user
        userEntity = new Data.Entities.UserEntity
        {
            Email = email,
            Name = name,
            ProfilePictureUrl = profilePictureUrl,
            Provider = provider,
            ProviderId = providerId,
            Role = 1, // Default to Viewer role
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow
        };

        _context.Users.Add(userEntity);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created new user: {Email} via {Provider}", email, provider);
        
        return MapToUser(userEntity);
    }

    public async Task<bool> IsAuthorized(int userId, UserRole requiredRole)
    {
        var user = await GetUserByIdAsync(userId);
        return user != null && user.Role >= requiredRole;
    }

    private async Task<(bool IsValid, string ProviderId, string Email, string Name, string? ProfilePictureUrl)> ValidateIdTokenAsync(string provider, string idToken)
    {
        try
        {
            // In production, you'd validate the token with the actual SSO provider
            // For now, decode without validation (THIS IS NOT SECURE - DEMO ONLY)
            
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(idToken);

            var providerId = token.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "oid")?.Value ?? "";
            var email = token.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == ClaimTypes.Email)?.Value ?? "";
            var name = token.Claims.FirstOrDefault(c => c.Type == "name" || c.Type == ClaimTypes.Name)?.Value ?? "";
            var picture = token.Claims.FirstOrDefault(c => c.Type == "picture")?.Value;

            if (string.IsNullOrEmpty(providerId) || string.IsNullOrEmpty(email))
            {
                return (false, "", "", "", null);
            }

            return (true, providerId, email, name, picture);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating ID token for provider {Provider}", provider);
            return (false, "", "", "", null);
        }
    }

    public async Task<(string? IdToken, string? Error)> ExchangeCodeForTokenAsync(
        Data.Entities.SsoProviderConfig config, string code, string? codeVerifier, string redirectUri)
    {
        try
        {
            var authority = config.Authority?.TrimEnd('/') ?? "";
            string tokenEndpoint = config.Provider.ToLower() switch
            {
                "microsoft" => authority.EndsWith("/v2.0", StringComparison.OrdinalIgnoreCase)
                    ? $"{authority.Replace("/v2.0", "", StringComparison.OrdinalIgnoreCase)}/oauth2/v2.0/token"
                    : $"{authority}/oauth2/v2.0/token",
                "google" => "https://oauth2.googleapis.com/token",
                "okta" => $"{authority}/v1/token",
                _ => $"{authority}/token"  // Ping / generic OIDC
            };

            using var http = new HttpClient();
            var form = new Dictionary<string, string>
            {
                ["grant_type"]    = "authorization_code",
                ["client_id"]     = config.ClientId,
                ["code"]          = code,
                ["redirect_uri"]  = redirectUri
            };
            if (!string.IsNullOrWhiteSpace(config.ClientSecret))
                form["client_secret"] = config.ClientSecret;
            if (!string.IsNullOrEmpty(codeVerifier))
                form["code_verifier"] = codeVerifier;

            var resp = await http.PostAsync(tokenEndpoint, new FormUrlEncodedContent(form));
            var body = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Token exchange failed {Status}: {Body}", resp.StatusCode, body);
                return (null, $"Token exchange failed: {resp.StatusCode}");
            }

            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("id_token", out var idTok))
                return (idTok.GetString(), null);
            if (doc.RootElement.TryGetProperty("access_token", out var accessTok))
                return (accessTok.GetString(), null);

            return (null, "No id_token in provider response");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging OAuth code for token");
            return (null, ex.Message);
        }
    }

    private static User MapToUser(Data.Entities.UserEntity entity)
    {
        return new User
        {
            Id = entity.Id,
            Email = entity.Email,
            Name = entity.Name,
            ProfilePictureUrl = entity.ProfilePictureUrl,
            Provider = entity.Provider,
            ProviderId = entity.ProviderId,
            TenantId = entity.TenantId,
            CreatedAt = entity.CreatedAt,
            LastLoginAt = entity.LastLoginAt,
            IsActive = entity.IsActive,
            Role = (UserRole)entity.Role,
            OrganizationName = entity.OrganizationName
        };
    }
}
