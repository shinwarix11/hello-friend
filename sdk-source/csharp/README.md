# Aegis SDK for C# / .NET

Official .NET client for the Aegis Authentication API. Targets `netstandard2.0`
and `net8.0`, so it runs on .NET 6+, .NET Framework 4.6.1+, Mono and Unity.

## Contents

```
Aegis.Sdk/            Library source
  AegisClient.cs      HTTP client + all API operations
  AegisOptions.cs     Configuration
  AegisException.cs   Typed error handling
  HardwareId.cs       Stable per-machine identifier
  Models.cs           Response models
examples/Quickstart/  Runnable console example
```

## Install

No package registry is required. Unzip this archive and reference the project:

```bash
dotnet add <your-app>.csproj reference Aegis.Sdk/Aegis.Sdk.csproj
```

Or drop `Aegis.Sdk/*.cs` straight into a Unity `Assets/Aegis` folder.

## Quickstart

```csharp
using Aegis.Sdk;

var aegis = new AegisClient(new AegisOptions
{
    BaseUrl = "https://your-aegis-host",
    AppKey  = Environment.GetEnvironmentVariable("AEGIS_APP_KEY")!,
    Version = "1.0.0",
});

var init = await aegis.InitializeAsync();
if (init.Version?.UpdateRequired == true)
    throw new Exception($"Update required: {init.Version.Latest}");

var login = await aegis.LoginAsync("ada", "hunter2");
Console.WriteLine($"Signed in as {login.User.Username}");

var license = await aegis.ValidateLicenseAsync("AEGS-4K7P-2M9X-QT31");
Console.WriteLine(license.Valid ? "License OK" : license.Status);

await aegis.SetVariableAsync("last_level", "12");
var vars = await aegis.GetVariablesAsync("user");

await aegis.LogoutAsync();
```

## Supported operations

| Method | Endpoint |
| --- | --- |
| `InitializeAsync` | `init` |
| `StatusAsync` | `status` |
| `RegisterAsync` | `register` |
| `LoginAsync` | `login` |
| `LogoutAsync` | `logout` |
| `HeartbeatAsync` | `heartbeat` |
| `CheckSessionAsync` | `session/check` |
| `ValidateLicenseAsync` | `license/validate` |
| `ActivateLicenseAsync` | `license/activate` |
| `GetVariablesAsync` / `SetVariableAsync` | `variables/get`, `variables/set` |
| `GetUserDataAsync` / `GetAppDataAsync` | `user/data`, `app/data` |
| `CheckVersionAsync` | `version/check` |
| `GetDownloadsAsync` | `downloads` |

## Error handling

Every failure throws `AegisException` carrying the API `Code` (for example
`hwid_mismatch`, `license_expired`, `invalid_credentials`) and HTTP status.

```csharp
try { await aegis.LoginAsync(user, pass); }
catch (AegisException ex) when (ex.Code == "hwid_mismatch") { /* ... */ }
```

## Sessions

`LoginAsync` stores the session token on the client and sends it as
`x-session-token`. `StartHeartbeat` keeps it alive and notifies you when the
session is revoked server-side:

```csharp
using var beat = aegis.StartHeartbeat(TimeSpan.FromMinutes(1), onRevoked: reason => App.Lock(reason));
```

## License

MIT — see `LICENSE`.