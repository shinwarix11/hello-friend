/**
 * Official SDK catalogue.
 *
 * Every entry maps to a real, complete SDK project in `sdk-source/`, packaged
 * on demand by `GET /api/public/sdk/:id`. There are no package-registry
 * installs: the platform hosts and serves each SDK itself.
 */
import { SDK_ARCHIVES, formatBytes } from "./sdk-manifest";

export type SdkStatus = "stable" | "beta" | "planned";

export type SdkSection = { title: string; body: string; language: string; code: string };

export type SdkRelease = { version: string; date: string; notes: string };

export type Sdk = {
  id: string;
  name: string;
  tagline: string;
  status: SdkStatus;
  language: string;
  /** Project/module name used inside the SDK itself. */
  package: string;
  /** Folder inside `sdk-source/` that is packaged for download. */
  dir: string;
  /** How the SDK is added to a project once the archive is unzipped. */
  setup: string;
  setupLanguage: string;
  platforms: string[];
  minimumRuntime: string;
  latest: string;
  sections: SdkSection[];
  releases: SdkRelease[];
};

/** Public download URL for an SDK archive. */
export function sdkDownloadUrl(sdk: Pick<Sdk, "id">): string {
  return `/api/public/sdk/${sdk.id}`;
}

/** File name the browser saves the archive as. */
export function sdkArchiveName(sdk: Pick<Sdk, "id" | "latest">): string {
  return `aegis-sdk-${sdk.id}-${sdk.latest}.zip`;
}

/** Human-readable package size, measured from the real source tree. */
export function sdkPackageSize(sdk: Pick<Sdk, "dir">): string {
  const archive = SDK_ARCHIVES[sdk.dir];
  return archive ? formatBytes(archive.bytes) : "—";
}

/** Number of files shipped in the SDK project. */
export function sdkFileCount(sdk: Pick<Sdk, "dir">): number {
  return SDK_ARCHIVES[sdk.dir]?.files ?? 0;
}

/** SHA-256 digest of the SDK source tree. */
export function sdkChecksum(sdk: Pick<Sdk, "dir">): string {
  const archive = SDK_ARCHIVES[sdk.dir];
  return archive ? `sha256:${archive.sha256}` : "—";
}

const jsFlow = (lang: string) => [
  {
    title: "Initialization",
    body: "Create the client once at process start and run the handshake before any UI is shown.",
    language: lang,
    code: `import { Aegis } from "@aegis/sdk";

const aegis = new Aegis({
  appKey: process.env.AEGIS_APP_KEY!,
  version: "1.0.0",
});

const init = await aegis.init();
if (init.version.update_required) {
  throw new Error("A mandatory update is available.");
}`,
  },
  {
    title: "License validation",
    body: "Validate before activating. Validation never consumes an activation slot.",
    language: lang,
    code: `const license = await aegis.licenses.validate({
  licenseKey: "AEGS-4K7P-2M9X-QT31",
  hwid: aegis.hardwareId(),
});

if (!license.valid) {
  console.error(license.status);
}`,
  },
  {
    title: "User login",
    body: "Login returns a session token that the client keeps in memory only.",
    language: lang,
    code: `const { session, user } = await aegis.auth.login({
  username: "ada",
  password: secret,
  hwid: aegis.hardwareId(),
});

console.log(\`Signed in as \${user.username}\`);`,
  },
  {
    title: "Variables",
    body: "Remote configuration and per-user state without shipping a new build.",
    language: lang,
    code: `const config = await aegis.variables.get({ scope: "application" });
await aegis.variables.set({ scope: "user", key: "last_level", value: "12" });`,
  },
  {
    title: "Sessions",
    body: "Heartbeat on an interval so revoked sessions lock the client immediately.",
    language: lang,
    code: `const stop = aegis.sessions.heartbeat({
  intervalMs: 60_000,
  onRevoked: () => app.lock("Your session ended."),
});

// on shutdown
stop();
await aegis.auth.logout();`,
  },
  {
    title: "Error handling",
    body: "Every failure surfaces as an AegisError carrying the documented error code.",
    language: lang,
    code: `import { AegisError } from "@aegis/sdk";

try {
  await aegis.auth.login({ username, password });
} catch (error) {
  if (error instanceof AegisError && error.code === "hwid_mismatch") {
    ui.show("This license is locked to another machine.");
  } else {
    throw error;
  }
}`,
  },
];

export const SDKS: Sdk[] = [
  {
    id: "csharp",
    name: "C#",
    tagline: ".NET client for desktop launchers, WPF and Unity.",
    status: "stable",
    language: "csharp",
    package: "Aegis.Sdk",
    dir: "csharp",
    setup: "dotnet add reference path/to/aegis-sdk-csharp/src/Aegis.Sdk.csproj",
    setupLanguage: "shell",
    platforms: ["Windows", "Linux", "macOS", "Unity"],
    minimumRuntime: ".NET 6.0",
    latest: "1.4.0",
    releases: [
      { version: "1.4.0", date: "2026-07-28", notes: "Async heartbeat host, cancellation token support." },
      { version: "1.3.1", date: "2026-06-14", notes: "Stable HWID provider on virtualised machines." },
      { version: "1.3.0", date: "2026-05-02", notes: "Variables API and signed requests." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "Construct once and reuse. The client is thread-safe and pools connections.",
        language: "csharp",
        code: `using Aegis.Sdk;

var aegis = new AegisClient(new AegisOptions
{
    AppKey = Environment.GetEnvironmentVariable("AEGIS_APP_KEY")!,
    Version = "1.0.0",
});

var init = await aegis.InitAsync();
if (init.Version.UpdateRequired)
    throw new InvalidOperationException("A mandatory update is available.");`,
      },
      {
        title: "License validation",
        body: "Validate on every launch, activate only when the user enters a new key.",
        language: "csharp",
        code: `var license = await aegis.Licenses.ValidateAsync("AEGS-4K7P-2M9X-QT31", aegis.HardwareId);

if (!license.Valid)
    Console.WriteLine($"License is {license.Status}");`,
      },
      {
        title: "User login",
        body: "Sessions are held in memory and refreshed by the heartbeat host.",
        language: "csharp",
        code: `var result = await aegis.Auth.LoginAsync(username, password, aegis.HardwareId);
Console.WriteLine($"Signed in as {result.User.Username}");`,
      },
      {
        title: "Variables",
        body: "Read shared configuration and persist per-user state.",
        language: "csharp",
        code: `var config = await aegis.Variables.GetAsync(VariableScope.Application);
await aegis.Variables.SetAsync(VariableScope.User, "last_level", "12");`,
      },
      {
        title: "Sessions",
        body: "Run the heartbeat as a hosted service and react to revocation.",
        language: "csharp",
        code: `using var heartbeat = aegis.Sessions.StartHeartbeat(TimeSpan.FromMinutes(1), onRevoked: () =>
{
    App.Lock("Your session ended.");
});

await aegis.Auth.LogoutAsync();`,
      },
      {
        title: "Error handling",
        body: "AegisException exposes the documented error code and HTTP status.",
        language: "csharp",
        code: `try
{
    await aegis.Auth.LoginAsync(username, password);
}
catch (AegisException ex) when (ex.Code == "license_expired")
{
    App.ShowRenewalPrompt();
}`,
      },
    ],
  },
  {
    id: "cpp",
    name: "C++",
    tagline: "Header-first client for native game and desktop clients.",
    status: "beta",
    language: "cpp",
    package: "aegis-cpp",
    dir: "cpp",
    setup: "cmake --build . # add_subdirectory(aegis-sdk-cpp)",
    setupLanguage: "shell",
    platforms: ["Windows", "Linux", "macOS"],
    minimumRuntime: "C++17",
    latest: "0.9.2",
    releases: [
      { version: "0.9.2", date: "2026-07-11", notes: "CMake package config, static linking on MSVC." },
      { version: "0.9.0", date: "2026-05-20", notes: "First public beta." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "The client owns its HTTP transport; construct it once at startup.",
        language: "cpp",
        code: `#include <aegis/client.hpp>

aegis::Client client({
    .app_key = std::getenv("AEGIS_APP_KEY"),
    .version = "1.0.0",
});

auto init = client.init();
if (init.version.update_required) {
    throw std::runtime_error("A mandatory update is available.");
}`,
      },
      {
        title: "License validation",
        body: "Validation is read-only and safe to call on every launch.",
        language: "cpp",
        code: `auto license = client.licenses().validate("AEGS-4K7P-2M9X-QT31", client.hardware_id());
if (!license.valid) {
    std::cerr << "License status: " << license.status << '\\n';
}`,
      },
      {
        title: "User login",
        body: "The session token is stored in the client and attached automatically.",
        language: "cpp",
        code: `auto session = client.auth().login(username, password, client.hardware_id());
std::cout << "Signed in as " << session.user.username << '\\n';`,
      },
      {
        title: "Variables",
        body: "Values are returned as a string map.",
        language: "cpp",
        code: `auto config = client.variables().get(aegis::Scope::Application);
client.variables().set(aegis::Scope::User, "last_level", "12");`,
      },
      {
        title: "Sessions",
        body: "Heartbeat runs on a detached worker thread.",
        language: "cpp",
        code: `auto heartbeat = client.sessions().start_heartbeat(std::chrono::seconds(60), [] {
    app::lock("Your session ended.");
});

client.auth().logout();`,
      },
      {
        title: "Error handling",
        body: "Errors are thrown as aegis::Error with the documented code.",
        language: "cpp",
        code: `try {
    client.auth().login(username, password);
} catch (const aegis::Error& e) {
    if (e.code() == "hwid_mismatch") app::show("Locked to another machine.");
    else throw;
}`,
      },
    ],
  },
  {
    id: "python",
    name: "Python",
    tagline: "Sync and async client for tooling, bots and backends.",
    status: "stable",
    language: "python",
    package: "aegis-sdk",
    dir: "python",
    setup: "pip install ./aegis-sdk-python",
    setupLanguage: "shell",
    platforms: ["CPython 3.9+", "PyPy"],
    minimumRuntime: "Python 3.9",
    latest: "1.2.3",
    releases: [
      { version: "1.2.3", date: "2026-07-19", notes: "AsyncAegis client, httpx transport." },
      { version: "1.2.0", date: "2026-06-02", notes: "Typed dataclass responses." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "Both a sync and an async client are available with identical methods.",
        language: "python",
        code: `import os
from aegis import Aegis

aegis = Aegis(app_key=os.environ["AEGIS_APP_KEY"], version="1.0.0")

init = aegis.init()
if init.version.update_required:
    raise SystemExit("A mandatory update is available.")`,
      },
      {
        title: "License validation",
        body: "Validation returns a typed result including remaining activations.",
        language: "python",
        code: `license = aegis.licenses.validate("AEGS-4K7P-2M9X-QT31", hwid=aegis.hardware_id)
if not license.valid:
    print("License status:", license.status)`,
      },
      {
        title: "User login",
        body: "The session token is attached to subsequent calls automatically.",
        language: "python",
        code: `result = aegis.auth.login(username="ada", password=secret, hwid=aegis.hardware_id)
print("Signed in as", result.user.username)`,
      },
      {
        title: "Variables",
        body: "Read configuration and write per-user state.",
        language: "python",
        code: `config = aegis.variables.get(scope="application")
aegis.variables.set(scope="user", key="last_level", value="12")`,
      },
      {
        title: "Sessions",
        body: "Use the context manager so the session is always closed.",
        language: "python",
        code: `with aegis.sessions.heartbeat(interval=60, on_revoked=lambda: app.lock()):
    app.run()

aegis.auth.logout()`,
      },
      {
        title: "Error handling",
        body: "AegisError carries the documented error code.",
        language: "python",
        code: `from aegis import AegisError

try:
    aegis.auth.login(username=username, password=password)
except AegisError as error:
    if error.code == "license_expired":
        app.show_renewal_prompt()
    else:
        raise`,
      },
    ],
  },
  {
    id: "javascript",
    name: "JavaScript",
    tagline: "Universal client for Node, Electron and the browser.",
    status: "stable",
    language: "javascript",
    package: "@aegis/sdk",
    dir: "javascript",
    setup: "import { Aegis } from './vendor/aegis-javascript/src/aegis.js';",
    setupLanguage: "javascript",
    platforms: ["Node 18+", "Electron", "Browsers"],
    minimumRuntime: "Node 18",
    latest: "2.1.0",
    releases: [
      { version: "2.1.0", date: "2026-07-30", notes: "Streaming heartbeat, zero dependencies." },
      { version: "2.0.0", date: "2026-05-08", notes: "ESM only, native fetch." },
    ],
    sections: jsFlow("javascript"),
  },
  {
    id: "typescript",
    name: "TypeScript",
    tagline: "Fully typed client with generated response models.",
    status: "stable",
    language: "typescript",
    package: "@aegis/sdk",
    dir: "typescript",
    setup: "npm install ./aegis-sdk-typescript",
    setupLanguage: "shell",
    platforms: ["Node 18+", "Electron", "Browsers", "Workers"],
    minimumRuntime: "TypeScript 5.0",
    latest: "2.1.0",
    releases: [
      { version: "2.1.0", date: "2026-07-30", notes: "Discriminated union error types." },
      { version: "2.0.0", date: "2026-05-08", notes: "Strict mode, exactOptionalPropertyTypes safe." },
    ],
    sections: jsFlow("typescript"),
  },
  {
    id: "rust",
    name: "Rust",
    tagline: "Async client built on tokio and reqwest.",
    status: "beta",
    language: "rust",
    package: "aegis-sdk",
    dir: "rust",
    setup: "aegis = { path = \"vendor/aegis-sdk-rust\" }",
    setupLanguage: "toml",
    platforms: ["Windows", "Linux", "macOS"],
    minimumRuntime: "Rust 1.75",
    latest: "0.8.1",
    releases: [
      { version: "0.8.1", date: "2026-07-05", notes: "rustls by default, no OpenSSL requirement." },
      { version: "0.8.0", date: "2026-04-22", notes: "First beta with full endpoint coverage." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "The client is cheap to clone and safe to share across tasks.",
        language: "rust",
        code: `use aegis_sdk::{Client, Options};

let client = Client::new(Options {
    app_key: std::env::var("AEGIS_APP_KEY")?,
    version: Some("1.0.0".into()),
    ..Default::default()
});

let init = client.init().await?;
if init.version.update_required {
    anyhow::bail!("A mandatory update is available.");
}`,
      },
      {
        title: "License validation",
        body: "All calls return `Result<T, AegisError>`.",
        language: "rust",
        code: `let license = client.licenses().validate("AEGS-4K7P-2M9X-QT31", Some(client.hardware_id())).await?;
if !license.valid {
    tracing::warn!(status = %license.status, "license rejected");
}`,
      },
      {
        title: "User login",
        body: "The session token is stored inside the client handle.",
        language: "rust",
        code: `let session = client.auth().login(&username, &password, Some(client.hardware_id())).await?;
println!("Signed in as {}", session.user.username);`,
      },
      {
        title: "Variables",
        body: "Variables are returned as a `HashMap<String, String>`.",
        language: "rust",
        code: `let config = client.variables().get(Scope::Application).await?;
client.variables().set(Scope::User, "last_level", "12").await?;`,
      },
      {
        title: "Sessions",
        body: "The heartbeat runs as a tokio task and is cancelled on drop.",
        language: "rust",
        code: `let heartbeat = client.sessions().heartbeat(Duration::from_secs(60));
tokio::spawn(async move { heartbeat.run(|| app::lock()).await });

client.auth().logout().await?;`,
      },
      {
        title: "Error handling",
        body: "Match on the typed error code enum.",
        language: "rust",
        code: `match client.auth().login(&username, &password, None).await {
    Ok(session) => app::start(session),
    Err(AegisError::Api { code, .. }) if code == "hwid_mismatch" => app::show_hwid_help(),
    Err(err) => return Err(err.into()),
}`,
      },
    ],
  },
  {
    id: "go",
    name: "Go",
    tagline: "Idiomatic, context-aware client for services and CLIs.",
    status: "beta",
    language: "go",
    package: "github.com/aegis-dev/aegis-go",
    dir: "go",
    setup: "replace github.com/aegis-dev/aegis-go => ./aegis-sdk-go",
    setupLanguage: "shell",
    platforms: ["Windows", "Linux", "macOS"],
    minimumRuntime: "Go 1.21",
    latest: "0.7.4",
    releases: [
      { version: "0.7.4", date: "2026-07-16", notes: "Context deadlines on every call." },
      { version: "0.7.0", date: "2026-04-30", notes: "First beta release." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "Every method takes a context so callers control timeouts.",
        language: "go",
        code: `client := aegis.New(aegis.Options{
    AppKey:  os.Getenv("AEGIS_APP_KEY"),
    Version: "1.0.0",
})

init, err := client.Init(ctx)
if err != nil {
    log.Fatal(err)
}
if init.Version.UpdateRequired {
    log.Fatal("a mandatory update is available")
}`,
      },
      {
        title: "License validation",
        body: "Validation never consumes an activation slot.",
        language: "go",
        code: `license, err := client.Licenses.Validate(ctx, "AEGS-4K7P-2M9X-QT31", client.HardwareID())
if err != nil {
    return err
}
if !license.Valid {
    log.Printf("license status: %s", license.Status)
}`,
      },
      {
        title: "User login",
        body: "The returned session token is stored on the client.",
        language: "go",
        code: `session, err := client.Auth.Login(ctx, username, password, client.HardwareID())
if err != nil {
    return err
}
log.Printf("signed in as %s", session.User.Username)`,
      },
      {
        title: "Variables",
        body: "Variables come back as map[string]string.",
        language: "go",
        code: `config, err := client.Variables.Get(ctx, aegis.ScopeApplication)
err = client.Variables.Set(ctx, aegis.ScopeUser, "last_level", "12")`,
      },
      {
        title: "Sessions",
        body: "Heartbeat runs in a goroutine bound to the context.",
        language: "go",
        code: `go client.Sessions.Heartbeat(ctx, time.Minute, func() { app.Lock() })

defer client.Auth.Logout(context.Background())`,
      },
      {
        title: "Error handling",
        body: "Use errors.As to reach the documented error code.",
        language: "go",
        code: `var apiErr *aegis.Error
if errors.As(err, &apiErr) && apiErr.Code == "license_exhausted" {
    app.ShowActivationLimit()
}`,
      },
    ],
  },
  {
    id: "java",
    name: "Java",
    tagline: "JVM client for desktop launchers and Spring services.",
    status: "beta",
    language: "java",
    package: "dev.aegis:aegis-sdk",
    dir: "java",
    setup: "javac -d out $(find aegis-sdk-java/src -name \"*.java\")",
    setupLanguage: "shell",
    platforms: ["JVM 17+", "Android"],
    minimumRuntime: "Java 17",
    latest: "0.6.2",
    releases: [
      { version: "0.6.2", date: "2026-07-09", notes: "Java 21 virtual thread friendly HTTP client." },
      { version: "0.6.0", date: "2026-05-15", notes: "First beta." },
    ],
    sections: [
      {
        title: "Initialization",
        body: "Build the client once and inject it where needed.",
        language: "java",
        code: `AegisClient aegis = AegisClient.builder()
    .appKey(System.getenv("AEGIS_APP_KEY"))
    .version("1.0.0")
    .build();

InitResult init = aegis.init();
if (init.version().updateRequired()) {
    throw new IllegalStateException("A mandatory update is available.");
}`,
      },
      {
        title: "License validation",
        body: "Records model every response.",
        language: "java",
        code: `LicenseResult license = aegis.licenses().validate("AEGS-4K7P-2M9X-QT31", aegis.hardwareId());
if (!license.valid()) {
    log.warn("License status {}", license.status());
}`,
      },
      {
        title: "User login",
        body: "The session token is stored on the client instance.",
        language: "java",
        code: `LoginResult result = aegis.auth().login(username, password, aegis.hardwareId());
log.info("Signed in as {}", result.user().username());`,
      },
      {
        title: "Variables",
        body: "Variables are returned as Map<String, String>.",
        language: "java",
        code: `Map<String, String> config = aegis.variables().get(Scope.APPLICATION);
aegis.variables().set(Scope.USER, "last_level", "12");`,
      },
      {
        title: "Sessions",
        body: "The heartbeat is an AutoCloseable scheduled task.",
        language: "java",
        code: `try (var heartbeat = aegis.sessions().heartbeat(Duration.ofMinutes(1), () -> app.lock())) {
    app.run();
}
aegis.auth().logout();`,
      },
      {
        title: "Error handling",
        body: "AegisException exposes the code and HTTP status.",
        language: "java",
        code: `try {
    aegis.auth().login(username, password);
} catch (AegisException ex) {
    if ("user_banned".equals(ex.code())) app.showSupportContact();
    else throw ex;
}`,
      },
    ],
  },
  {
    id: "php",
    name: "PHP",
    tagline: "PSR-18 client for web backends and license portals.",
    status: "planned",
    language: "php",
    package: "aegis/sdk",
    dir: "php",
    setup: "composer config repositories.aegis path ./aegis-sdk-php && composer require aegis/sdk:@dev",
    setupLanguage: "shell",
    platforms: ["PHP 8.1+", "Laravel", "Symfony"],
    minimumRuntime: "PHP 8.1",
    latest: "0.4.0",
    releases: [{ version: "0.4.0", date: "2026-06-25", notes: "Preview release: authentication and licensing." }],
    sections: [
      {
        title: "Initialization",
        body: "Any PSR-18 HTTP client can be injected.",
        language: "php",
        code: `use Aegis\\Client;

$aegis = new Client([
    'app_key' => getenv('AEGIS_APP_KEY'),
    'version' => '1.0.0',
]);

$init = $aegis->init();
if ($init->version->updateRequired) {
    throw new RuntimeException('A mandatory update is available.');
}`,
      },
      {
        title: "License validation",
        body: "Ideal for validating keys inside a customer portal.",
        language: "php",
        code: `$license = $aegis->licenses()->validate('AEGS-4K7P-2M9X-QT31');
if (!$license->valid) {
    echo "License status: {$license->status}";
}`,
      },
      {
        title: "User login",
        body: "Store the returned session token in your PHP session.",
        language: "php",
        code: `$result = $aegis->auth()->login($username, $password);
$_SESSION['aegis_token'] = $result->session->token;`,
      },
      {
        title: "Variables",
        body: "Read shared configuration server-side.",
        language: "php",
        code: `$config = $aegis->variables()->get('application');
$aegis->variables()->set('user', 'last_level', '12');`,
      },
      {
        title: "Sessions",
        body: "Verify a stored token before serving protected pages.",
        language: "php",
        code: `$check = $aegis->sessions()->check($_SESSION['aegis_token']);
if (!$check->valid) {
    header('Location: /login');
}`,
      },
      {
        title: "Error handling",
        body: "AegisException carries the documented code.",
        language: "php",
        code: `try {
    $aegis->auth()->login($username, $password);
} catch (Aegis\\AegisException $e) {
    if ($e->getCode() === 'invalid_credentials') {
        $error = 'Incorrect username or password.';
    }
}`,
      },
    ],
  },
  {
    id: "lua",
    name: "Lua",
    tagline: "Lightweight client for embedded scripting runtimes.",
    status: "planned",
    language: "lua",
    package: "aegis",
    dir: "lua",
    setup: "package.path = 'aegis-sdk-lua/src/?.lua;aegis-sdk-lua/src/?/init.lua;' .. package.path",
    setupLanguage: "lua",
    platforms: ["Lua 5.4", "LuaJIT"],
    minimumRuntime: "Lua 5.4",
    latest: "0.3.0",
    releases: [{ version: "0.3.0", date: "2026-06-18", notes: "Preview release: init, login and license validation." }],
    sections: [
      {
        title: "Initialization",
        body: "The module returns a client factory.",
        language: "lua",
        code: `local aegis = require("aegis").new({
  app_key = os.getenv("AEGIS_APP_KEY"),
  version = "1.0.0",
})

local init = aegis:init()
if init.version.update_required then
  error("A mandatory update is available.")
end`,
      },
      {
        title: "License validation",
        body: "Returns a plain Lua table.",
        language: "lua",
        code: `local license = aegis.licenses:validate("AEGS-4K7P-2M9X-QT31", aegis:hardware_id())
if not license.valid then
  print("License status: " .. license.status)
end`,
      },
      {
        title: "User login",
        body: "The token is stored on the client table.",
        language: "lua",
        code: `local result = aegis.auth:login(username, password, aegis:hardware_id())
print("Signed in as " .. result.user.username)`,
      },
      {
        title: "Variables",
        body: "Configuration is returned as a key/value table.",
        language: "lua",
        code: `local config = aegis.variables:get("application")
aegis.variables:set("user", "last_level", "12")`,
      },
      {
        title: "Sessions",
        body: "Call heartbeat from your existing game loop timer.",
        language: "lua",
        code: `if os.time() - last_beat > 60 then
  aegis.sessions:heartbeat()
  last_beat = os.time()
end`,
      },
      {
        title: "Error handling",
        body: "Calls return nil plus an error table.",
        language: "lua",
        code: `local ok, err = aegis.auth:login(username, password)
if not ok then
  if err.code == "license_expired" then show_renewal() end
end`,
      },
    ],
  },
];

export function findSdk(id: string) {
  return SDKS.find((s) => s.id === id);
}

export const SDK_STATUS_LABEL: Record<SdkStatus, string> = {
  stable: "Stable",
  beta: "Beta",
  planned: "Preview",
};
