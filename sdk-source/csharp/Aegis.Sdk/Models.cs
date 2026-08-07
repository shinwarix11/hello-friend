using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Aegis.Sdk
{
    public sealed class AegisUser
    {
        [JsonPropertyName("id")] public string Id { get; set; } = "";
        [JsonPropertyName("username")] public string Username { get; set; } = "";
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("hwid")] public string? Hwid { get; set; }
        [JsonPropertyName("created_at")] public string? CreatedAt { get; set; }
        [JsonPropertyName("last_login_at")] public string? LastLoginAt { get; set; }
    }

    public sealed class AegisLicense
    {
        [JsonPropertyName("key")] public string? Key { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("expires_at")] public string? ExpiresAt { get; set; }
        [JsonPropertyName("activations")] public int Activations { get; set; }
        [JsonPropertyName("max_activations")] public int MaxActivations { get; set; }
        [JsonPropertyName("level")] public int Level { get; set; }
    }

    public sealed class AegisSession
    {
        [JsonPropertyName("token")] public string Token { get; set; } = "";
        [JsonPropertyName("expires_at")] public string? ExpiresAt { get; set; }
    }

    public sealed class AegisVersionInfo
    {
        [JsonPropertyName("latest")] public string? Latest { get; set; }
        [JsonPropertyName("current")] public string? Current { get; set; }
        [JsonPropertyName("update_available")] public bool UpdateAvailable { get; set; }
        [JsonPropertyName("update_required")] public bool UpdateRequired { get; set; }
        [JsonPropertyName("download_url")] public string? DownloadUrl { get; set; }
        [JsonPropertyName("changelog")] public string? Changelog { get; set; }
    }

    public sealed class AegisInitResult
    {
        [JsonPropertyName("application")] public Dictionary<string, object?>? Application { get; set; }
        [JsonPropertyName("version")] public AegisVersionInfo? Version { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
    }

    public sealed class AegisAuthResult
    {
        [JsonPropertyName("user")] public AegisUser User { get; set; } = new AegisUser();
        [JsonPropertyName("license")] public AegisLicense? License { get; set; }
        [JsonPropertyName("session")] public AegisSession? Session { get; set; }
    }

    public sealed class AegisLicenseResult
    {
        [JsonPropertyName("valid")] public bool Valid { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("license")] public AegisLicense? License { get; set; }
        [JsonPropertyName("activated")] public bool Activated { get; set; }
    }

    public sealed class AegisSessionCheck
    {
        [JsonPropertyName("valid")] public bool Valid { get; set; }
        [JsonPropertyName("alive")] public bool Alive { get; set; }
        [JsonPropertyName("user")] public AegisUser? User { get; set; }
        [JsonPropertyName("expires_at")] public string? ExpiresAt { get; set; }
    }

    public sealed class AegisVariables
    {
        [JsonPropertyName("scope")] public string? Scope { get; set; }
        [JsonPropertyName("variables")] public Dictionary<string, string> Values { get; set; } = new Dictionary<string, string>();
    }
}