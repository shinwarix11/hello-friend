using Aegis.Sdk;

// Runnable console quickstart for the Aegis .NET SDK.
//
//   export AEGIS_BASE_URL="https://your-aegis-host"
//   export AEGIS_APP_KEY="pk_live_..."
//   dotnet run

var options = new AegisOptions
{
    BaseUrl = Environment.GetEnvironmentVariable("AEGIS_BASE_URL") ?? "http://localhost:8080",
    AppKey = Environment.GetEnvironmentVariable("AEGIS_APP_KEY") ?? throw new InvalidOperationException("AEGIS_APP_KEY is required."),
    Version = "1.0.0",
};

using var aegis = new AegisClient(options);

try
{
    var init = await aegis.InitializeAsync();
    Console.WriteLine($"Initialized. Status: {init.Status}");

    if (init.Version?.UpdateRequired == true)
    {
        Console.WriteLine($"Mandatory update to {init.Version.Latest}: {init.Version.DownloadUrl}");
        return;
    }

    Console.Write("Username: ");
    var username = Console.ReadLine() ?? "";
    Console.Write("Password: ");
    var password = ReadPassword();

    var login = await aegis.LoginAsync(username, password);
    Console.WriteLine($"Welcome {login.User.Username}.");

    if (login.License != null)
        Console.WriteLine($"License {login.License.Key} expires {login.License.ExpiresAt ?? "never"}.");

    var vars = await aegis.GetVariablesAsync("user");
    foreach (var pair in vars.Values) Console.WriteLine($"  {pair.Key} = {pair.Value}");

    await aegis.SetVariableAsync("last_seen", DateTime.UtcNow.ToString("O"));

    using var beat = aegis.StartHeartbeat(TimeSpan.FromMinutes(1),
        onRevoked: reason => Console.WriteLine($"Session revoked: {reason}"));

    Console.WriteLine("Press enter to sign out.");
    Console.ReadLine();
    await aegis.LogoutAsync();
}
catch (AegisException ex) when (ex.IsLicenseError)
{
    Console.Error.WriteLine($"License problem ({ex.Code}): {ex.Message}");
}
catch (AegisException ex)
{
    Console.Error.WriteLine($"Aegis error ({ex.Code}): {ex.Message}");
}

static string ReadPassword()
{
    var buffer = new System.Text.StringBuilder();
    ConsoleKeyInfo key;
    while ((key = Console.ReadKey(true)).Key != ConsoleKey.Enter)
    {
        if (key.Key == ConsoleKey.Backspace && buffer.Length > 0) buffer.Length--;
        else if (!char.IsControl(key.KeyChar)) buffer.Append(key.KeyChar);
    }
    Console.WriteLine();
    return buffer.ToString();
}