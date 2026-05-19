namespace CloudLens.API.Data.Entities;

public class GlobalGcpCredentials
{
    public int Id { get; set; }
    public string ServiceAccountJson { get; set; } = string.Empty; // Should be encrypted in production
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
