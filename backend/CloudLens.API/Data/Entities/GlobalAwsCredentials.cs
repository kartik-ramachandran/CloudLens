namespace CloudLens.API.Data.Entities;

public class GlobalAwsCredentials
{
    public int Id { get; set; }
    public string AccessKeyId { get; set; } = string.Empty;
    public string SecretAccessKey { get; set; } = string.Empty; // Should be encrypted in production
    public string Region { get; set; } = "us-east-1";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
