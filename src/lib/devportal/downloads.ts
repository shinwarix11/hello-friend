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
