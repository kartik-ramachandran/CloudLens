using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AzureLens.API.Data.Entities;

[Table("Users")]
public class UserEntity
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? ProfilePictureUrl { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty; // "Microsoft", "Google", "Okta", "Ping"
    
    [Required]
    [MaxLength(255)]
    public string ProviderId { get; set; } = string.Empty;
    
    [MaxLength(255)]
    public string? TenantId { get; set; }
    
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    [Required]
    public int Role { get; set; } = 1; // 1=Viewer, 2=Editor, 3=Admin
    
    [MaxLength(255)]
    public string? OrganizationName { get; set; }
}
