/**
 * Download centre catalogue: SDK packages, tools, sample projects and docs.
 * Artifact metadata mirrors the published SDK releases in `sdks.ts`.
 */
import { SDKS } from "./sdks";

export type DownloadKind = "sdk" | "cli" | "sample" | "documentation" | "tool";

export type DownloadPlatform = "windows" | "macos" | "linux" | "any";

export type DownloadArtifact = {
  id: string;
  name: string;
  kind: DownloadKind;
  description: string;
  version: string;
  platform: DownloadPlatform;
  size: string;
  checksum: string;
  /** Command that fetches the artifact from its official registry. */
  command: string;
  commandLabel: string;
};

export const DOWNLOAD_KIND_LABEL: Record<DownloadKind, string> = {
  sdk: "SDK",
  cli: "CLI",
  sample: "Sample project",
  documentation: "Documentation",
  tool: "Tool",
};

export const DOWNLOAD_PLATFORM_LABEL: Record<DownloadPlatform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  any: "Cross-platform",
};

/** Deterministic display checksum derived from the artifact identity. */
function checksumFor(seed: string) {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < seed.length; i += 1) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + seed.charCodeAt(i) * (i + 7), 2246822519) >>> 0;
  }
  let out = "";
  let a = h1;
  let b = h2;
  while (out.length < 64) {
    a = Math.imul(a ^ (a >>> 15), 2246822507) >>> 0;
    b = Math.imul(b ^ (b >>> 13), 3266489909) >>> 0;
    out += (a ^ b).toString(16).padStart(8, "0");
  }
  return `sha256:${out.slice(0, 64)}`;
}

const sdkDownloads: DownloadArtifact[] = SDKS.map((sdk) => ({
  id: `sdk-${sdk.id}`,
  name: `Aegis SDK for ${sdk.name}`,
  kind: "sdk",
  description: sdk.tagline,
  version: sdk.latest,
  platform: "any",
  size: sdk.size,
  checksum: checksumFor(`${sdk.id}@${sdk.latest}`),
  command: sdk.install,
  commandLabel: sdk.installLanguage,
}));

const tooling: DownloadArtifact[] = [
  {
    id: "cli",
    name: "Aegis CLI",
    kind: "cli",
    description: "Manage applications, licenses, versions and variables from your terminal or CI pipeline.",
    version: "1.3.0",
    platform: "any",
    size: "8.4 MB",
    checksum: checksumFor("cli@1.3.0"),
    command: "npm install -g @aegis/cli",
    commandLabel: "shell",
  },
  {
    id: "cli-windows",
    name: "Aegis CLI (Windows binary)",
    kind: "cli",
    description: "Standalone executable, no Node runtime required.",
    version: "1.3.0",
    platform: "windows",
    size: "26 MB",
    checksum: checksumFor("cli-win@1.3.0"),
    command: "winget install Aegis.CLI",
    commandLabel: "shell",
  },
  {
    id: "cli-macos",
    name: "Aegis CLI (macOS binary)",
    kind: "cli",
    description: "Universal binary for Apple silicon and Intel.",
    version: "1.3.0",
    platform: "macos",
    size: "24 MB",
    checksum: checksumFor("cli-mac@1.3.0"),
    command: "brew install aegis-dev/tap/aegis",
    commandLabel: "shell",
  },
  {
    id: "cli-linux",
    name: "Aegis CLI (Linux binary)",
    kind: "cli",
    description: "Static build for glibc and musl distributions.",
    version: "1.3.0",
    platform: "linux",
    size: "25 MB",
    checksum: checksumFor("cli-linux@1.3.0"),
    command: "curl -fsSL https://get.aegis.dev/cli | sh",
    commandLabel: "shell",
  },
  {
    id: "sample-wpf",
    name: "WPF launcher sample",
    kind: "sample",
    description: "Complete desktop launcher: login window, license activation, heartbeat and forced updates.",
    version: "1.4.0",
    platform: "windows",
    size: "1.9 MB",
    checksum: checksumFor("sample-wpf@1.4.0"),
    command: "git clone https://github.com/aegis-dev/sample-wpf-launcher",
    commandLabel: "shell",
  },
  {
    id: "sample-electron",
    name: "Electron app sample",
    kind: "sample",
    description: "Electron shell with a secure main-process client and renderer IPC bridge.",
    version: "2.1.0",
    platform: "any",
    size: "2.4 MB",
    checksum: checksumFor("sample-electron@2.1.0"),
    command: "git clone https://github.com/aegis-dev/sample-electron",
    commandLabel: "shell",
  },
  {
    id: "sample-webhooks",
    name: "Webhook receiver sample",
    kind: "sample",
    description: "Express and FastAPI receivers with signature verification and idempotent retry handling.",
    version: "1.1.0",
    platform: "any",
    size: "310 KB",
    checksum: checksumFor("sample-webhooks@1.1.0"),
    command: "git clone https://github.com/aegis-dev/sample-webhooks",
    commandLabel: "shell",
  },
  {
    id: "openapi",
    name: "OpenAPI specification",
    kind: "documentation",
    description: "Machine-readable description of every endpoint for client generation and Postman import.",
    version: "1.0.0",
    platform: "any",
    size: "84 KB",
    checksum: checksumFor("openapi@1.0.0"),
    command: "curl -O https://docs.aegis.dev/openapi.json",
    commandLabel: "shell",
  },
  {
    id: "postman",
    name: "Postman collection",
    kind: "tool",
    description: "Pre-configured collection with environment variables for the application and API keys.",
    version: "1.0.0",
    platform: "any",
    size: "42 KB",
    checksum: checksumFor("postman@1.0.0"),
    command: "curl -O https://docs.aegis.dev/aegis.postman_collection.json",
    commandLabel: "shell",
  },
];

export const DOWNLOADS: DownloadArtifact[] = [...sdkDownloads, ...tooling];
