namespace AzureLens.API.Models;

public class AKSPod
{
    public string ClusterName { get; set; } = string.Empty;
    public string Namespace { get; set; } = string.Empty;
    public string PodName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ReadyContainers { get; set; }
    public int TotalContainers { get; set; }
    public int RestartCount { get; set; }
    public string NodeName { get; set; } = string.Empty;
    public string PodIP { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
    public List<ContainerStatus> Containers { get; set; } = new();
    public Dictionary<string, string> Labels { get; set; } = new();
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
}

public class ContainerStatus
{
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public bool Ready { get; set; }
    public int RestartCount { get; set; }
    public string State { get; set; } = string.Empty;
    public string StateReason { get; set; } = string.Empty;
}
