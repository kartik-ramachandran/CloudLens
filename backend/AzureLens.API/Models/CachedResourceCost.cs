using System;
using System.Collections.Generic;

namespace AzureLens.API.Models;

public partial class CachedResourceCost
{
    public int Id { get; set; }

    public string ContextHash { get; set; } = null!;

    public string ResourceId { get; set; } = null!;

    public string ResourceName { get; set; } = null!;

    public string ResourceType { get; set; } = null!;

    public string ResourceGroup { get; set; } = null!;

    public string TotalCost { get; set; } = null!;

    public string MonthlyCostsJson { get; set; } = null!;

    public string CachedAt { get; set; } = null!;
}
