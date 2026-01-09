using System.Net.Http.Json;
using System.Text.Json;

namespace AzureLensMcp.Server.Services
{
    public class AzureLensService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiBaseUrl;
        private readonly string _tenantId;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private string? _authToken;

        public AzureLensService(string apiBaseUrl, string tenantId, string clientId, string clientSecret)
        {
            _httpClient = new HttpClient();
            _apiBaseUrl = apiBaseUrl.TrimEnd('/');
            _tenantId = tenantId;
            _clientId = clientId;
            _clientSecret = clientSecret;
        }

        private async Task EnsureAuthenticatedAsync()
        {
            if (_authToken != null) return;

            var credentials = new
            {
                tenantId = _tenantId,
                clientId = _clientId,
                clientSecret = _clientSecret
            };

            var response = await _httpClient.PostAsJsonAsync($"{_apiBaseUrl}/api/azure/connect", credentials);
            response.EnsureSuccessStatusCode();
            
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            _authToken = result.GetProperty("token").GetString();
        }

        public async Task<List<object>> GetSubscriptionsAsync()
        {
            await EnsureAuthenticatedAsync();
            
            var response = await _httpClient.GetAsync($"{_apiBaseUrl}/api/azure/subscriptions");
            response.EnsureSuccessStatusCode();
            
            var subscriptions = await response.Content.ReadFromJsonAsync<List<object>>();
            return subscriptions ?? new List<object>();
        }

        public async Task<List<object>> GetResourcesAsync(string subscriptionId, string? resourceGroupName = null)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"{_apiBaseUrl}/api/azure/resources?subscriptionId={subscriptionId}";
            if (!string.IsNullOrEmpty(resourceGroupName))
            {
                url += $"&resourceGroupName={resourceGroupName}";
            }
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var resources = await response.Content.ReadFromJsonAsync<List<object>>();
            return resources ?? new List<object>();
        }

        public async Task<object> GetCostsAsync(string subscriptionId, string startDate, string endDate)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"{_apiBaseUrl}/api/azure/costs?subscriptionId={subscriptionId}&startDate={startDate}&endDate={endDate}";
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            return await response.Content.ReadFromJsonAsync<object>() ?? new { };
        }

        public async Task<List<object>> GetResourceSkusAsync(string subscriptionId, string? location = null)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"{_apiBaseUrl}/api/azure/skus?subscriptionId={subscriptionId}";
            if (!string.IsNullOrEmpty(location))
            {
                url += $"&location={location}";
            }
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var skus = await response.Content.ReadFromJsonAsync<List<object>>();
            return skus ?? new List<object>();
        }

        public async Task<List<object>> GetResourceGroupsAsync(string subscriptionId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"{_apiBaseUrl}/api/azure/resource-groups?subscriptionId={subscriptionId}";
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var resourceGroups = await response.Content.ReadFromJsonAsync<List<object>>();
            return resourceGroups ?? new List<object>();
        }

        public async Task<List<object>> GetRecommendationsAsync(string subscriptionId)
        {
            await EnsureAuthenticatedAsync();
            
            var url = $"{_apiBaseUrl}/api/azure/recommendations?subscriptionId={subscriptionId}";
            
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            
            var recommendations = await response.Content.ReadFromJsonAsync<List<object>>();
            return recommendations ?? new List<object>();
        }
    }
}
