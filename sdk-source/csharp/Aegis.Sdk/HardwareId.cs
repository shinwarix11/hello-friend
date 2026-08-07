using System;
using System.Security.Cryptography;
using System.Text;

namespace Aegis.Sdk
{
    /// <summary>Stable, non-reversible per-machine identifier.</summary>
    public static class HardwareId
    {
        private static string? _cached;

        /// <summary>SHA-256 of machine name + user + OS + processor count.</summary>
        public static string Current
        {
            get
            {
                if (_cached != null) return _cached;
                var seed = string.Join("|",
                    Environment.MachineName,
                    Environment.UserName,
                    Environment.OSVersion.Platform.ToString(),
                    Environment.ProcessorCount.ToString(),
                    Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER") ?? "");

                using (var sha = SHA256.Create())
                {
                    var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(seed));
                    var sb = new StringBuilder(64);
                    foreach (var b in hash) sb.Append(b.ToString("x2"));
                    _cached = sb.ToString();
                }

                return _cached;
            }
        }
    }
}