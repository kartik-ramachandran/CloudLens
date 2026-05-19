using System;
using System.Collections.Generic;

namespace CloudLens.API.Models;

public partial class CachedResource
{
    public int Id { get; set; }

    public string ResourceId { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string Location { get; set; } = null!;

    public string SubscriptionId { get; set; } = null!;

    public string ResourceGroup { get; set; } = null!;

    public string TagsJson { get; set; } = null!;

    public DateTime CachedAt { get; set; }
}
