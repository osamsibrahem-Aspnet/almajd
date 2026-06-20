using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Almajd.Application.Common;
using Almajd.Application.DTOs.Auth;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Almajd.IntegrationTests.Infrastructure;

/// <summary>
/// Helpers for obtaining authenticated HttpClients.
/// GetAdminClient() posts to /api/auth/login with the seeded admin credentials and returns
/// a pre-authorized HttpClient for use in tests.
/// </summary>
public static class AuthHelpers
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task<HttpClient> GetAdminClientAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var loginPayload = new LoginDto
        {
            Email = "admin@almajd.local",
            Password = "Admin@12345"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", loginPayload);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<AuthResponseDto>>(body, JsonOpts)
            ?? throw new InvalidOperationException($"Failed to deserialize login response: {body}");

        if (!apiResponse.IsSuccess || apiResponse.Data is null)
            throw new InvalidOperationException($"Login failed: {apiResponse.Message}");

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiResponse.Data.Token);

        return client;
    }

    /// <summary>
    /// Returns a raw (unauthenticated) client — useful for 401 tests.
    /// </summary>
    public static HttpClient GetAnonymousClient(WebApplicationFactory<Program> factory)
    {
        return factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
    }

    /// <summary>
    /// Deserializes an ApiResponse<T> from an HttpResponseMessage.
    /// </summary>
    public static async Task<ApiResponse<T>> ReadApiResponseAsync<T>(this HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ApiResponse<T>>(body, JsonOpts)
               ?? throw new InvalidOperationException($"Null deserialization from: {body}");
    }

    /// <summary>
    /// Deserializes an ApiResponse (non-generic) from an HttpResponseMessage.
    /// </summary>
    public static async Task<ApiResponse> ReadApiResponseAsync(this HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ApiResponse>(body, JsonOpts)
               ?? throw new InvalidOperationException($"Null deserialization from: {body}");
    }
}
