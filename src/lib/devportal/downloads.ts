/**
 * Download centre catalogue: SDK packages, tools, sample projects and docs.
 * Artifact metadata mirrors the published SDK releases in `sdks.ts`.
 */
import { SDKS, sdkArchiveName, sdkChecksum, sdkDownloadUrl, sdkPackageSize } from "./sdks";

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
  /** Direct download URL served by this platform. */
  url: string;
  /** File name saved by the browser. */
  fileName: string;
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
  size: sdkPackageSize(sdk),
  checksum: sdkChecksum(sdk),
  url: sdkDownloadUrl(sdk),
  fileName: sdkArchiveName(sdk),
}));

export const DOWNLOADS: DownloadArtifact[] = sdkDownloads;
