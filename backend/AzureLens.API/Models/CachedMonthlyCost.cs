using System;
using System.Collections.Generic;

namespace AzureLens.API.Models;

public partial class CachedMonthlyCost
{
    public int Id { get; set; }

    public string ContextHash { get; set; } = null!;

    public string Month { get; set; } = null!;

    public string Cost { get; set; } = null!;

    public string Currency { get; set; } = null!;

    public string CachedAt { get; set; } = null!;
}
