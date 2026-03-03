namespace AzureLens.API.Services;

public interface IAuthService
{
    Task<(bool Success, Models.User? User, string? Error)> AuthenticateWithSsoAsync(string provider, string idToken);
    string GenerateJwtToken(Models.User user);
    Task<Models.User?> GetUserByIdAsync(int userId);
    Task<Models.User?> GetOrCreateUserAsync(string provider, string providerId, string email, string name, string? profilePictureUrl = null);
    Task<bool> IsAuthorized(int userId, Models.UserRole requiredRole);
    Task<(string? IdToken, string? Error)> ExchangeCodeForTokenAsync(Data.Entities.SsoProviderConfig config, string code, string? codeVerifier, string redirectUri);
}
