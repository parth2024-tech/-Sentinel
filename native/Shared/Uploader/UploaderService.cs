using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Sentinel.Shared;

namespace Sentinel.Uploader;

public class UploaderService
{
    private static readonly HttpClient _httpClient = new HttpClient();
    private const string BaseUrl = "https://sentinelapp.io";

    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static async Task<(bool success, string? reportId, string? claimToken)> UploadPairCodeAsync(string pairCode, SentinelReport report)
    {
        var rawJson = JsonSerializer.Serialize(report, JsonOptions);
        
        // Match the expected payload format: { pairCode, rawJson: <parsed object> }
        var payload = new
        {
            pairCode = pairCode,
            rawJson = report
        };

        var jsonContent = JsonSerializer.Serialize(payload, JsonOptions);

        return await UploadWithRetryAsync(async () =>
        {
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{BaseUrl}/api/pair/push", content);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Upload failed with status code {response.StatusCode}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;

            bool ok = root.TryGetProperty("ok", out var okElement) && okElement.GetBoolean();
            string? reportId = root.TryGetProperty("reportId", out var rId) ? rId.GetString() : null;
            string? claimToken = root.TryGetProperty("claimToken", out var cToken) ? cToken.GetString() : null;

            return (ok, reportId, claimToken);
        }, rawJson);
    }

    private static async Task<(bool, string?, string?)> UploadWithRetryAsync(Func<Task<(bool, string?, string?)>> uploadAction, string rawJson)
    {
        int[] delays = { 2000, 4000, 8000 };
        for (int i = 0; i <= delays.Length; i++)
        {
            try
            {
                return await uploadAction();
            }
            catch (Exception)
            {
                if (i < delays.Length)
                {
                    await Task.Delay(delays[i]);
                }
            }
        }

        // If all retries fail, write to %APPDATA%\Sentinel\pending-report.json
        try
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var sentinelDir = Path.Combine(appData, "Sentinel");
            Directory.CreateDirectory(sentinelDir);
            
            var pendingFile = Path.Combine(sentinelDir, "pending-report.json");
            File.WriteAllText(pendingFile, rawJson);
        }
        catch { }

        return (false, null, null);
    }

    public static async Task<(bool success, string? reportId)> UploadDeviceTokenAsync(string deviceToken, SentinelReport report)
    {
        var rawJson = JsonSerializer.Serialize(report, JsonOptions);
        
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/api/reports");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deviceToken);
        request.Content = new StringContent(rawJson, Encoding.UTF8, "application/json");

        var (success, reportId, _) = await UploadWithRetryAsync(async () =>
        {
            // Create a new request for each retry because request messages cannot be reused
            using var retryRequest = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/api/reports");
            retryRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deviceToken);
            retryRequest.Content = new StringContent(rawJson, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(retryRequest);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Upload failed with status code {response.StatusCode}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;

            string? rId = root.TryGetProperty("id", out var idElem) ? idElem.GetString() : null;

            return (true, rId, null);
        }, rawJson);

        return (success, reportId);
    }
}
