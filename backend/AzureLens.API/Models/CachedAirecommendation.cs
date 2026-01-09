using System;
using System.Collections.Generic;

namespace AzureLens.API.Models;

public partial class CachedAirecommendation
{
    public int Id { get; set; }

    public string Category { get; set; } = null!;

    public string Title { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Priority { get; set; } = null!;

    public string? PotentialSavings { get; set; }

    public string Effort { get; set; } = null!;

    public string ContextHash { get; set; } = null!;

    public string CachedAt { get; set; } = null!;
}
