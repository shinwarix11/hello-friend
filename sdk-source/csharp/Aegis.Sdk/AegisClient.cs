using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Aegis.Sdk
{
    /// <summary>Thread-safe client for the Aegis Authentication API.</summary>
    public sealed class AegisClient : IDisposable
    {
        private static readonly JsonSerializerOptions JsonOpts = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        };

        private readonly AegisOptions _options;
        private readonly HttpClient _http;
        private readonly bool _ownsHttp;

        /// <summary>Current session token, set by Login/Register and cleared by Logout.</summary>
        public string? SessionToken { get; private set; }

        /// <summary>Hardware id sent with auth and license calls.</summary>
        public string Hwid { get; }

        public AegisClient(AegisOptions options, HttpClient? httpClient = null)
        {
            options.Validate();
            _options = options;
            _ownsHttp = httpClient == null;
            _http = httpClient ?? new HttpClient();
            _http.Timeout = options.Timeout;
            Hwid = string.IsNullOrWhiteSpace(options.Hwid) ? HardwareId.Current : options.Hwid!;
        }

        /* ---------------- core transport ---------------- */

        /// <summary>Calls any endpoint and returns the raw `data` object.</summary>
        public async Task<JsonElement> RequestAsync(string endpoint, object? body = null, CancellationToken ct = default)
        {
            var url = _options.BaseUrl.TrimEnd('/') + "/api/public/v1/" + endpoint.Trim('/');
            var payload = JsonSerializer.Serialize(body ?? new { }, JsonOpts);
            Exception? last = null;

            for (var attempt = 0; attempt <= Math.Max(0, _options.MaxRetries); attempt++)
            {
                try
                {
                    using (var request = new HttpRequestMessage(HttpMethod.Post, url))
                    {
                        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                        request.Headers.TryAddWithoutValidation("x-app-key", _options.AppKey);
                        if (!string.IsNullOrEmpty(_options.ApiKey))
                            request.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
                        if (!string.IsNullOrEmpty(SessionToken))
                            request.Headers.TryAddWithoutValidation("x-session-token", SessionToken);
                        request.Headers.TryAddWithoutValidation("x-timestamp",
                            DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());

                        using (var response = await _http.SendAsync(request, ct).ConfigureAwait(false))
                        {
                            var text = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                            var status = (int)response.StatusCode;

                            if (status >= 500 && attempt < _options.MaxRetries)
                            {
                                await Task.Delay(250 * (attempt + 1), ct).ConfigureAwait(false);
                                continue;
                            }

                            JsonDocument doc;
                            try { doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text); }
                            catch (Exception ex) { throw new AegisException("invalid_response", "Malformed API response.", status, ex); }

                            using (doc)
                            {
                                var root = doc.RootElement;
                                var success = root.TryGetProperty("success", out var s) && s.ValueKind == JsonValueKind.True;
                                if (!success)
                                {
                                    var code = "server_error";
                                    var message = "Request failed.";
                                    if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.Object)
                                    {
                                        if (err.TryGetProperty("code", out var c)) code = c.GetString() ?? code;
                                        if (err.TryGetProperty("message", out var m)) message = m.GetString() ?? message;
                                    }
                                    throw new AegisException(code, message, status);
                                }

                                return root.TryGetProperty("data", out var data)
                                    ? data.Clone()
                                    : JsonDocument.Parse("{}").RootElement.Clone();
                            }
                        }
                    }
                }
                catch (AegisException) { throw; }
                catch (Exception ex)
                {
                    last = ex;
                    if (attempt >= _options.MaxRetries) break;
                    await Task.Delay(250 * (attempt + 1), ct).ConfigureAwait(false);
                }
            }

            throw new AegisException("network_error", last?.Message ?? "Network request failed.", 0, last);
        }

        private async Task<T> RequestAsync<T>(string endpoint, object? body = null, CancellationToken ct = default)
            where T : class, new()
        {
            var data = await RequestAsync(endpoint, body, ct).ConfigureAwait(false);
            return JsonSerializer.Deserialize<T>(data.GetRawText(), JsonOpts) ?? new T();
        }

        /* ---------------- application ---------------- */

        /// <summary>Handshake. Call once before any other operation.</summary>
        public Task<AegisInitResult> InitializeAsync(CancellationToken ct = default) =>
            RequestAsync<AegisInitResult>("init", new { version = _options.Version }, ct);

        /// <summary>Lightweight availability probe.</summary>
        public Task<JsonElement> StatusAsync(CancellationToken ct = default) => RequestAsync("status", null, ct);

        /// <summary>Application-wide public data.</summary>
        public Task<JsonElement> GetAppDataAsync(CancellationToken ct = default) => RequestAsync("app/data", null, ct);

        /// <summary>Compares a build against the published version for the channel.</summary>
        public Task<AegisVersionInfo> CheckVersionAsync(string? version = null, CancellationToken ct = default) =>
            RequestAsync<AegisVersionInfo>("version/check",
                new { version = version ?? _options.Version, channel = _options.Channel }, ct);

        /// <summary>Download entries published for a version.</summary>
        public Task<JsonElement> GetDownloadsAsync(string? version = null, CancellationToken ct = default) =>
            RequestAsync("downloads", new { version = version ?? _options.Version }, ct);

        /* ---------------- authentication ---------------- */

        /// <summary>Registers a user, optionally redeeming a license key.</summary>
        public async Task<AegisAuthResult> RegisterAsync(string username, string password, string? email = null,
            string? licenseKey = null, CancellationToken ct = default)
        {
            var result = await RequestAsync<AegisAuthResult>("register",
                new { username, password, email, license_key = licenseKey, hwid = Hwid }, ct).ConfigureAwait(false);
            if (result.Session != null) SessionToken = result.Session.Token;
            return result;
        }

        /// <summary>Authenticates a user and stores the returned session token.</summary>
        public async Task<AegisAuthResult> LoginAsync(string username, string password, CancellationToken ct = default)
        {
            var result = await RequestAsync<AegisAuthResult>("login",
                new { username, password, hwid = Hwid }, ct).ConfigureAwait(false);
            if (result.Session != null) SessionToken = result.Session.Token;
            return result;
        }

        /// <summary>Terminates the active session.</summary>
        public async Task LogoutAsync(CancellationToken ct = default)
        {
            try { await RequestAsync("logout", null, ct).ConfigureAwait(false); }
            finally { SessionToken = null; }
        }

        /// <summary>Keeps the session alive; throws when it has been revoked.</summary>
        public Task<AegisSessionCheck> HeartbeatAsync(CancellationToken ct = default) =>
            RequestAsync<AegisSessionCheck>("heartbeat", null, ct);

        /// <summary>Validates the current session token.</summary>
        public Task<AegisSessionCheck> CheckSessionAsync(CancellationToken ct = default) =>
            RequestAsync<AegisSessionCheck>("session/check", null, ct);

        /// <summary>True when a session token exists and the server still accepts it.</summary>
        public async Task<bool> IsAuthenticatedAsync(CancellationToken ct = default)
        {
            if (string.IsNullOrEmpty(SessionToken)) return false;
            try { return (await CheckSessionAsync(ct).ConfigureAwait(false)).Valid; }
            catch (AegisException) { return false; }
        }

        /// <summary>Restores a session token persisted by the host application.</summary>
        public void UseSession(string token) => SessionToken = token;

        /// <summary>Profile and metadata for the signed-in user.</summary>
        public Task<JsonElement> GetUserDataAsync(CancellationToken ct = default) => RequestAsync("user/data", null, ct);

        /* ---------------- licensing ---------------- */

        /// <summary>Validates a key without consuming an activation slot.</summary>
        public Task<AegisLicenseResult> ValidateLicenseAsync(string licenseKey, CancellationToken ct = default) =>
            RequestAsync<AegisLicenseResult>("license/validate", new { license_key = licenseKey, hwid = Hwid }, ct);

        /// <summary>Binds a key to this machine (and optionally to a username).</summary>
        public Task<AegisLicenseResult> ActivateLicenseAsync(string licenseKey, string? username = null,
            CancellationToken ct = default) =>
            RequestAsync<AegisLicenseResult>("license/activate",
                new { license_key = licenseKey, hwid = Hwid, username }, ct);

        /* ---------------- variables ---------------- */

        /// <summary>Reads variables for "application", "user" or "license" scope.</summary>
        public Task<AegisVariables> GetVariablesAsync(string scope = "application", string? licenseKey = null,
            CancellationToken ct = default) =>
            RequestAsync<AegisVariables>("variables/get", new { scope, license_key = licenseKey }, ct);

        /// <summary>Writes a variable. Defaults to the "user" scope.</summary>
        public Task<JsonElement> SetVariableAsync(string key, string value, string scope = "user",
            string? licenseKey = null, CancellationToken ct = default) =>
            RequestAsync("variables/set", new { scope, key, value, license_key = licenseKey }, ct);

        /* ---------------- webhooks ---------------- */

        /// <summary>Triggers a custom webhook event (requires an API key).</summary>
        public Task<JsonElement> TriggerWebhookAsync(string @event, object? payload = null, CancellationToken ct = default) =>
            RequestAsync("webhook/trigger", new { @event, payload = payload ?? new { } }, ct);

        /* ---------------- heartbeat host ---------------- */

        /// <summary>Starts a background heartbeat loop. Dispose the result to stop it.</summary>
        public IDisposable StartHeartbeat(TimeSpan interval, Action<string>? onRevoked = null,
            Action<AegisSessionCheck>? onBeat = null)
        {
            var cts = new CancellationTokenSource();
            _ = Task.Run(async () =>
            {
                while (!cts.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(interval, cts.Token).ConfigureAwait(false);
                        var beat = await HeartbeatAsync(cts.Token).ConfigureAwait(false);
                        onBeat?.Invoke(beat);
                    }
                    catch (OperationCanceledException) { return; }
                    catch (AegisException ex)
                    {
                        if (ex.IsNetworkError) continue;
                        SessionToken = null;
                        onRevoked?.Invoke(ex.Message);
                        return;
                    }
                }
            });
            return new HeartbeatHandle(cts);
        }

        private sealed class HeartbeatHandle : IDisposable
        {
            private readonly CancellationTokenSource _cts;
            public HeartbeatHandle(CancellationTokenSource cts) { _cts = cts; }
            public void Dispose() { _cts.Cancel(); _cts.Dispose(); }
        }

        public void Dispose()
        {
            if (_ownsHttp) _http.Dispose();
        }
    }
}