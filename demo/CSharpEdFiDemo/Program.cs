using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

class Program
{
    static async Task Main(string[] args)
    {
        // Load configuration
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false)
            .Build();

        var apiBaseUrl =
            config["EdFi:ApiBaseUrl"]
            ?? throw new InvalidOperationException("EdFi:ApiBaseUrl not configured");
        var tokenUrl =
            config["EdFi:TokenUrl"]
            ?? throw new InvalidOperationException("EdFi:TokenUrl not configured");
        var clientId =
            config["EdFi:ClientId"]
            ?? throw new InvalidOperationException("EdFi:ClientId not configured");
        var clientSecret =
            config["EdFi:ClientSecret"]
            ?? throw new InvalidOperationException("EdFi:ClientSecret not configured");

        try
        {
            Console.WriteLine("==== Ed-Fi C# Authentication & API Demo ====\n");

            // Step 1: Authenticate
            Console.WriteLine("1. Authenticating with Ed-Fi API...");
            var token = await AuthenticateAsync(tokenUrl, clientId, clientSecret);
            Console.WriteLine($"✓ Authentication successful");
            Console.WriteLine($"  Token: {token}\n");

            // Step 2: Create an academic subject descriptor
            Console.WriteLine("2. Creating an academic subject descriptor...");

            var academicSubjectDescriptor = CreateAcademicSubjectDescriptor();

            var current = academicSubjectDescriptor;
            for (int i = 0; i < 25000; i++)
            {
                current.self = CreateAcademicSubjectDescriptor();
                current = current.self;
            }

            var descriptorResponse = await CreateAcademicSubjectDescriptorAsync(
                apiBaseUrl,
                token,
                academicSubjectDescriptor
            );

            if (descriptorResponse.IsSuccessStatusCode)
            {
                var descriptorLocation =
                    descriptorResponse.Headers.Location?.ToString() ?? "No location header";
                Console.WriteLine($"✓ AcademicSubjectDescriptor created successfully");
                Console.WriteLine($"  Code: {academicSubjectDescriptor.codeValue}");
                Console.WriteLine($"  Location: {descriptorLocation}\n");
            }
            else
            {
                var descriptorErrorContent = await descriptorResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"✗ Failed to create AcademicSubjectDescriptor");
                Console.WriteLine($"  Status: {descriptorResponse.StatusCode}");
                Console.WriteLine($"  Error: {descriptorErrorContent}\n");
            }

            Console.WriteLine("==== Demo Complete ====");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Error: {ex.Message}");
            // Console.WriteLine(ex.StackTrace);
            Environment.Exit(1);
        }

        static AsDescriptor CreateAcademicSubjectDescriptor()
        {
            return new AsDescriptor
            {
                codeValue = "M",
                @namespace = "uri://ed-fi.org/AcademicSubjectDescriptor",
                shortDescription = "M",
                self = null,
            };
        }
    }

    public class AsDescriptor
    {
        public string codeValue { get; set; }
        public string description { get; set; }
        public string @namespace { get; set; }
        public string shortDescription { get; set; }
        public AsDescriptor? self { get; set; }
    }

    static async Task<string> AuthenticateAsync(
        string tokenUrl,
        string clientId,
        string clientSecret
    )
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true,
        };
        using var client = new HttpClient(handler);

        var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
        {
            Content = new FormUrlEncodedContent(
                new Dictionary<string, string>
                {
                    { "grant_type", "client_credentials" },
                    { "client_id", clientId },
                    { "client_secret", clientSecret },
                }
            ),
        };

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("No access token in response");
    }

    static async Task<HttpResponseMessage> CreateAcademicSubjectDescriptorAsync(
        string apiBaseUrl,
        string token,
        object descriptorPayload
    )
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true,
        };
        using var client = new HttpClient(handler);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var url = $"{apiBaseUrl}/data/v3/ed-fi/academicSubjectDescriptors";
        Console.WriteLine($"POST {url}");

        string jsonString = BuildDescriptorJson((AsDescriptor)descriptorPayload);
        var content = new StringContent(jsonString, Encoding.UTF8, "application/json");

        return await client.PostAsync(url, content);
    }

    static string BuildDescriptorJson(AsDescriptor descriptor)
    {
        // Traverse to the end of the linked list to get depth
        var current = descriptor;
        int depth = 1;
        while (current.self != null)
        {
            current = current.self;
            depth++;
        }

        // Build JSON iteratively from the deepest level
        var sb = new StringBuilder();
        sb.Append('{');
        sb.Append($"\"codeValue\":\"{EscapeJson(current.codeValue)}\",");
        sb.Append($"\"description\":\"{EscapeJson(current.description)}\",");
        sb.Append($"\"namespace\":\"{EscapeJson(current.@namespace)}\",");
        sb.Append($"\"shortDescription\":\"{EscapeJson(current.shortDescription)}\"");
        sb.Append('}');

        // Walk backward through the chain, wrapping each level
        var nodes = new List<AsDescriptor>();
        current = descriptor;
        while (current != null)
        {
            nodes.Add(current);
            current = current.self;
        }

        // Wrap from second-to-last to first
        for (int i = nodes.Count - 2; i >= 0; i--)
        {
            var wrapper = new StringBuilder();
            wrapper.Append('{');
            wrapper.Append($"\"codeValue\":\"{EscapeJson(nodes[i].codeValue)}\",");
            wrapper.Append($"\"description\":\"{EscapeJson(nodes[i].description)}\",");
            wrapper.Append($"\"namespace\":\"{EscapeJson(nodes[i].@namespace)}\",");
            wrapper.Append($"\"shortDescription\":\"{EscapeJson(nodes[i].shortDescription)}\",");
            wrapper.Append("\"self\":");
            wrapper.Append(sb.ToString());
            wrapper.Append('}');
            sb = wrapper;
        }

        return sb.ToString();
    }

    static void BuildDescriptorJsonRecursive(AsDescriptor descriptor, StringBuilder sb)
    {
        sb.Append('{');
        sb.Append($"\"codeValue\":\"{EscapeJson(descriptor.codeValue)}\",");
        sb.Append($"\"description\":\"{EscapeJson(descriptor.description)}\",");
        sb.Append($"\"namespace\":\"{EscapeJson(descriptor.@namespace)}\",");
        sb.Append($"\"shortDescription\":\"{EscapeJson(descriptor.shortDescription)}\"");

        if (descriptor.self != null)
        {
            sb.Append(",\"self\":");
            BuildDescriptorJsonRecursive(descriptor.self, sb);
        }

        sb.Append('}');
    }

    static string EscapeJson(string value)
    {
        if (string.IsNullOrEmpty(value))
            return value;

        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }
}
