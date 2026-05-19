namespace CloudLens.API.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    
    // SSO Identity
    public string Provider { get; set; } = string.Empty; // "Microsoft", "Google", "Okta", "Ping", etc.
    public string ProviderId { get; set; } = string.Empty; // User ID from SSO provider
    public string? TenantId { get; set; } // For multi-tenant SSO (e.g., Microsoft, Okta)
    
    // Authentication
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    
    // Role - simplified single role per user
    public UserRole Role { get; set; } = UserRole.Viewer;
    
    // Organization
    public string? OrganizationName { get; set; }
}

public enum UserRole
{
    Viewer = 1,      // Can view dashboards and data
    Editor = 2,      // Can edit configurations, export data
    Admin = 3        // Full access including credential management
}

public class LoginRequest
{
    public string Provider { get; set; } = string.Empty;
    public string? IdToken { get; set; } // For client-side SSO flow
    public string? AuthorizationCode { get; set; } // For server-side OAuth flow
    public string? RedirectUri { get; set; }
}

public class LoginResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; } // JWT token
    public User? User { get; set; }
    public string? Error { get; set; }
}

public class TokenPayload
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string Provider { get; set; } = string.Empty;
}
