using System;
using System.Collections.Generic;

namespace CloudLens.API.Models;

public partial class CachedCost
{
    public int Id { get; set; }

    public string SubscriptionId { get; set; } = null!;

    public string SubscriptionName { get; set; } = null!;

    public decimal TotalCost { get; set; }

    public string Currency { get; set; } = null!;

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string CostsByServiceJson { get; set; } = null!;

    public DateTime CachedAt { get; set; }
}
