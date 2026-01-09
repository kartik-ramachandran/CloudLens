namespace AzureLens.API.Models;

public class AKSService
{
    public string ClusterName { get; set; } = string.Empty;
    public string Namespace { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string ClusterIP { get; set; } = string.Empty;
    public List<string> ExternalIPs { get; set; } = new();
    public List<ServicePort> Ports { get; set; } = new();
    public string Status { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
    public Dictionary<string, string> Labels { get; set; } = new();
    public Dictionary<string, string> Selectors { get; set; } = new();
    public string SubscriptionId { get; set; } = string.Empty;
    public string SubscriptionName { get; set; } = string.Empty;
    public string ResourceGroup { get; set; } = string.Empty;
    public List<IngressInfo> Ingresses { get; set; } = new();
}

public class ServicePort
{
    public string Name { get; set; } = string.Empty;
    public string Protocol { get; set; } = string.Empty;
    public int Port { get; set; }
    public int? TargetPort { get; set; }
    public int? NodePort { get; set; }
}

public class IngressInfo
{
    public string Name { get; set; } = string.Empty;
    public string Namespace { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public List<string> Hosts { get; set; } = new();
    public List<IngressRule> Rules { get; set; } = new();
    public string Address { get; set; } = string.Empty;
    public Dictionary<string, string> Annotations { get; set; } = new();
}

public class IngressRule
{
    public string Host { get; set; } = string.Empty;
    public List<IngressPath> Paths { get; set; } = new();
}

public class IngressPath
{
    public string Path { get; set; } = string.Empty;
    public string PathType { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int ServicePort { get; set; }
}
