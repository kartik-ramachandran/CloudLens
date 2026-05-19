namespace CloudLens.API.Data.Entities;

public class CachedResource
{
    public int Id { get; set; }
    public string ResourceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string SubscriptionId { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public string TagsJson { get; set; } = "{}";
    public DateTime CachedAt { get; set; }
}
