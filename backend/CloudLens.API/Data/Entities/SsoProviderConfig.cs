using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CloudLens.API.Data.Entities;

/// <summary>
/// Stores SSO provider configurations for multi-tenant support
/// Admins can configure multiple SSO providers (Microsoft, Google, Okta, Ping, etc.)
/// </summary>
[Table("SsoProviderConfigs")]
public class SsoProviderConfig
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty; // "Microsoft", "Google", "Okta", "Ping"
    
    [Required]
    [MaxLength(255)]
    public string ClientId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string ClientSecret { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Authority { get; set; } // e.g., "https://login.microsoftonline.com/{tenant}"
    
    [MaxLength(255)]
    public string? TenantId { get; set; } // For Microsoft/Okta multi-tenant
    
    [MaxLength(500)]
    public string? RedirectUri { get; set; }
    
    [MaxLength(1000)]
    public string? Scopes { get; set; } // Comma-separated scopes
    
    [Required]
    public bool IsEnabled { get; set; } = true;
    
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(255)]
    public string? OrganizationName { get; set; } // Optional: restrict to specific org
}
