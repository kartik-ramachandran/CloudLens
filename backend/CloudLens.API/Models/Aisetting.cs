using System;
using System.Collections.Generic;

namespace CloudLens.API.Models;

public partial class Aisetting
{
    public int Id { get; set; }

    public string Provider { get; set; } = null!;

    public string ApiKey { get; set; } = null!;

    public string Model { get; set; } = null!;

    public string? Endpoint { get; set; }

    public int MaxTokens { get; set; }

    public double Temperature { get; set; }

    public DateTime UpdatedAt { get; set; }
}
