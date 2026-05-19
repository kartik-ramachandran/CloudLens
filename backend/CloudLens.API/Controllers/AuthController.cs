using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using CloudLens.API.Data;
using CloudLens.API.Models;
using CloudLens.API.Services;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, AppDbContext context, ILogger<AuthController> logger, IConfiguration configuration)
    {
        _authService = authService;
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// POST /api/auth/login
    /// Authenticates user via SSO provider
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Provider) || string.IsNullOrEmpty(request.IdToken))
            {
                return BadRequest(new LoginResponse
                {
                    Success = false,
                    Error = "Provider and IdToken are required"
                });
            }

            var (success, user, error) = await _authService.AuthenticateWithSsoAsync(request.Provider, request.IdToken);

            if (!success || user == null)
            {
                return Unauthorized(new LoginResponse
                {
                    Success = false,
                    Error = error ?? "Authentication failed"
                });
            }

            var token = _authService.GenerateJwtToken(user);

            return Ok(new LoginResponse
            {
                Success = true,
                Token = token,
                User = user
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new LoginResponse
            {
                Success = false,
                Error = "Internal server error"
            });
        }
    }

    /// <summary>
    /// GET /api/auth/me
    /// Returns current user profile
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return Unauthorized();
            }

            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// POST /api/auth/callback
    /// Exchanges an OAuth2 authorization code for a JWT using the configured provider's client secret.
    /// </summary>
    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleCallback([FromBody] OAuthCallbackRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Provider) || string.IsNullOrEmpty(request.Code))
                return BadRequest(new LoginResponse { Success = false, Error = "Provider and Code are required" });

            var providerConfig = await _context.SsoProviderConfigs
                .FirstOrDefaultAsync(p => p.Provider == request.Provider && p.IsEnabled);

            providerConfig ??= GetExternalAuthProviderConfig(request.Provider);

            if (providerConfig == null)
                return BadRequest(new LoginResponse { Success = false, Error = $"SSO provider '{request.Provider}' is not configured or disabled" });

            if (string.IsNullOrWhiteSpace(providerConfig.ClientSecret))
                return BadRequest(new LoginResponse { Success = false, Error = $"SSO provider '{request.Provider}' is missing a client secret" });

            var (idToken, tokenError) = await _authService.ExchangeCodeForTokenAsync(
                providerConfig, request.Code, request.CodeVerifier, request.RedirectUri);

            if (idToken == null)
                return Unauthorized(new LoginResponse { Success = false, Error = tokenError ?? "Token exchange failed" });

            var (success, user, authError) = await _authService.AuthenticateWithSsoAsync(request.Provider, idToken);
            if (!success || user == null)
                return Unauthorized(new LoginResponse { Success = false, Error = authError ?? "Authentication failed" });

            var jwt = _authService.GenerateJwtToken(user);
            return Ok(new LoginResponse { Success = true, Token = jwt, User = user });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling OAuth callback");
            return StatusCode(500, new LoginResponse { Success = false, Error = "Internal server error" });
        }
    }

    private Data.Entities.SsoProviderConfig? GetExternalAuthProviderConfig(string provider)
    {
        if (provider.Equals("Google", StringComparison.OrdinalIgnoreCase))
        {
            var clientId = _configuration["ExternalAuth:Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                return null;

            return new Data.Entities.SsoProviderConfig
            {
                Provider = "Google",
                ClientId = clientId,
                ClientSecret = _configuration["ExternalAuth:Google:ClientSecret"] ?? "",
                Authority = "https://accounts.google.com",
                Scopes = "openid,profile,email",
                IsEnabled = true
            };
        }

        if (provider.Equals("Microsoft", StringComparison.OrdinalIgnoreCase))
        {
            var clientId = _configuration["ExternalAuth:Microsoft:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
                return null;

            var tenantId = _configuration["ExternalAuth:Microsoft:TenantId"] ?? "common";
            return new Data.Entities.SsoProviderConfig
            {
                Provider = "Microsoft",
                ClientId = clientId,
                ClientSecret = _configuration["ExternalAuth:Microsoft:ClientSecret"] ?? "",
                Authority = $"https://login.microsoftonline.com/{tenantId}",
                TenantId = tenantId,
                Scopes = "openid,profile,email",
                IsEnabled = true
            };
        }

        return null;
    }

    /// <summary>
    /// POST /api/auth/register
    /// Creates a new email/password account.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] EmailRegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new LoginResponse { Success = false, Error = "Name, email, and password are required." });

        if (request.Password.Length < 8)
            return BadRequest(new LoginResponse { Success = false, Error = "Password must be at least 8 characters." });

        var (success, user, error) = await _authService.RegisterWithEmailAsync(request.Email, request.Password, request.Name, request.OrganizationName);
        if (!success || user == null)
            return BadRequest(new LoginResponse { Success = false, Error = error });

        var token = _authService.GenerateJwtToken(user);
        return Ok(new LoginResponse { Success = true, Token = token, User = user });
    }

    /// <summary>
    /// POST /api/auth/email-login
    /// Authenticates an email/password account.
    /// </summary>
    [HttpPost("email-login")]
    [AllowAnonymous]
    public async Task<IActionResult> EmailLogin([FromBody] EmailLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new LoginResponse { Success = false, Error = "Email and password are required." });

        var (success, user, error) = await _authService.LoginWithEmailAsync(request.Email, request.Password);
        if (!success || user == null)
            return Unauthorized(new LoginResponse { Success = false, Error = error });

        var token = _authService.GenerateJwtToken(user);
        return Ok(new LoginResponse { Success = true, Token = token, User = user });
    }

    /// <summary>
    /// GET /api/auth/social-providers
    /// Returns Google/Microsoft client IDs configured in appsettings for the public login page.
    /// These are separate from enterprise SSO providers.
    /// </summary>
    [HttpGet("social-providers")]
    [AllowAnonymous]
    public IActionResult GetSocialProviders()
    {
        var providers = new List<object>();

        var googleClientId = _configuration["ExternalAuth:Google:ClientId"];
        if (!string.IsNullOrWhiteSpace(googleClientId))
            providers.Add(new { provider = "Google", clientId = googleClientId, authority = "https://accounts.google.com" });

        var msClientId = _configuration["ExternalAuth:Microsoft:ClientId"];
        var msTenant = _configuration["ExternalAuth:Microsoft:TenantId"] ?? "common";
        if (!string.IsNullOrWhiteSpace(msClientId))
            providers.Add(new { provider = "Microsoft", clientId = msClientId, authority = $"https://login.microsoftonline.com/{msTenant}/v2.0" });

        return Ok(providers);
    }

    /// <summary>
    /// GET /api/auth/providers
    /// Returns list of enabled SSO providers
    /// </summary>
    [HttpGet("providers")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProviders()
    {
        try
        {
            var providers = await _context.SsoProviderConfigs
                .Where(p => p.IsEnabled)
                .Select(p => new
                {
                    p.Provider,
                    p.ClientId,
                    p.Authority,
                    p.RedirectUri,
                    p.Scopes
                })
                .ToListAsync();

            // Map scopes after query execution
            var result = providers.Select(p => new
            {
                p.Provider,
                p.ClientId,
                p.Authority,
                p.RedirectUri,
                Scopes = p.Scopes != null ? p.Scopes.Split(',', StringSplitOptions.None) : new string[0]
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SSO providers");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// POST /api/auth/providers (Admin only)
    /// Configure SSO provider
    /// </summary>
    [HttpPost("providers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ConfigureProvider([FromBody] Data.Entities.SsoProviderConfig config)
    {
        try
        {
            // Check if provider already exists
            var existing = await _context.SsoProviderConfigs
                .FirstOrDefaultAsync(p => p.Provider == config.Provider && p.TenantId == config.TenantId);

            if (existing != null)
            {
                // Update existing
                existing.ClientId = config.ClientId;
                existing.ClientSecret = config.ClientSecret;
                existing.Authority = config.Authority;
                existing.RedirectUri = config.RedirectUri;
                existing.Scopes = config.Scopes;
                existing.IsEnabled = config.IsEnabled;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Create new
                config.CreatedAt = DateTime.UtcNow;
                config.UpdatedAt = DateTime.UtcNow;
                _context.SsoProviderConfigs.Add(config);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "SSO provider configured successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error configuring SSO provider");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// GET /api/auth/users (Admin only)
    /// List all users
    /// </summary>
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _context.Users
                .OrderByDescending(u => u.LastLoginAt)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.Name,
                    u.Provider,
                    u.Role,
                    u.IsActive,
                    u.CreatedAt,
                    u.LastLoginAt,
                    u.OrganizationName
                })
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// PATCH /api/auth/users/{id}/role (Admin only)
    /// Update user role
    /// </summary>
    [HttpPatch("users/{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleRequest request)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            user.Role = (int)request.Role;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User role updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user role");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public class UpdateRoleRequest
{
    public UserRole Role { get; set; }
}

public class OAuthCallbackRequest
{
    public string Provider { get; set; } = "";
    public string Code { get; set; } = "";
    public string? CodeVerifier { get; set; }
    public string RedirectUri { get; set; } = "";
}

public class EmailRegisterRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? OrganizationName { get; set; }
}

public class EmailLoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class SsoHandoffRequest
{
    public string CfToken { get; set; } = "";
}
