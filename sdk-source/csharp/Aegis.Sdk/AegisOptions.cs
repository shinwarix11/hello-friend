using System;

namespace Aegis.Sdk
{
    /// <summary>Configuration for <see cref="AegisClient"/>.</summary>
    public sealed class AegisOptions
    {
        /// <summary>Base URL of the Aegis deployment, e.g. https://your-aegis-host.</summary>
        public string BaseUrl { get; set; } = "";

        /// <summary>Application public key (sent as the x-app-key header).</summary>
        public string AppKey { get; set; } = "";

        /// <summary>Optional server-side API key for privileged endpoints.</summary>
        public string? ApiKey { get; set; }

        /// <summary>Client build version reported to init/version check.</summary>
        public string Version { get; set; } = "1.0.0";

        /// <summary>Release channel used by version checks.</summary>
        public string Channel { get; set; } = "stable";

        /// <summary>Hardware id. Defaults to <see cref="HardwareId.Current"/>.</summary>
        public string? Hwid { get; set; }

        /// <summary>Per-request timeout.</summary>
        public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(20);

        /// <summary>Retry count for transient network/5xx failures.</summary>
        public int MaxRetries { get; set; } = 2;

        internal void Validate()
        {
            if (string.IsNullOrWhiteSpace(BaseUrl)) throw new ArgumentException("BaseUrl is required.", nameof(BaseUrl));
            if (string.IsNullOrWhiteSpace(AppKey)) throw new ArgumentException("AppKey is required.", nameof(AppKey));
        }
    }
}