namespace CloudLens.API.Models;

// === App Registration Secrets ===

public class AppSecretInfo
{
    public string AppObjectId { get; set; } = "";
    public string AppId { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string SecretId { get; set; } = "";
    public string SecretDisplayName { get; set; } = "";
    public string? ExpiryDate { get; set; }
    public int DaysUntilExpiry { get; set; }
    public string Status { get; set; } = ""; // "expired" | "expiring_soon" | "healthy"
}

public class AppSecretsReport
{
    public int TotalApps { get; set; }
    public int TotalSecrets { get; set; }
    public int ExpiredSecrets { get; set; }
    public int ExpiringSoon30d { get; set; }
    public int ExpiringSoon90d { get; set; }
    public int HealthySecrets { get; set; }
    public List<AppSecretInfo> Secrets { get; set; } = new();
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// === Key Vault Secrets & Certificates ===

public class KeyVaultExpiryItem
{
    public string VaultName { get; set; } = "";
    public string VaultId { get; set; } = "";
    public string ResourceGroup { get; set; } = "";
    public string SubscriptionId { get; set; } = "";
    public string ItemName { get; set; } = "";
    public string ItemType { get; set; } = ""; // "secret" | "certificate"
    public string? ExpiryDate { get; set; }
    public int DaysUntilExpiry { get; set; }
    public string Status { get; set; } = ""; // "expired" | "expiring_soon" | "healthy" | "no_expiry"
}

public class KeyVaultExpiryReport
{
    public int TotalVaults { get; set; }
    public int TotalItems { get; set; }
    public int ExpiredItems { get; set; }
    public int ExpiringSoon30d { get; set; }
    public int ExpiringSoon90d { get; set; }
    public int HealthyItems { get; set; }
    public int NoExpiryItems { get; set; }
    public List<KeyVaultExpiryItem> Items { get; set; } = new();
    public string GeneratedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
