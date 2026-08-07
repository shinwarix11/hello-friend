using System;

namespace Aegis.Sdk
{
    /// <summary>Every Aegis API failure surfaces as this exception.</summary>
    public class AegisException : Exception
    {
        /// <summary>Documented API error code, e.g. "hwid_mismatch".</summary>
        public string Code { get; }

        /// <summary>HTTP status code (0 for transport failures).</summary>
        public int StatusCode { get; }

        public AegisException(string code, string message, int statusCode = 0, Exception? inner = null)
            : base(message, inner)
        {
            Code = code;
            StatusCode = statusCode;
        }

        public bool IsAuthError => Code == "unauthorized" || Code == "invalid_credentials";
        public bool IsLicenseError => Code.StartsWith("license", StringComparison.Ordinal) || Code == "hwid_mismatch";
        public bool IsNetworkError => StatusCode == 0;

        public override string ToString() => $"AegisException({Code}, http {StatusCode}): {Message}";
    }
}