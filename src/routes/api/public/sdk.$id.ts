import { createFileRoute } from "@tanstack/react-router";

import { SDKS } from "@/lib/devportal/sdks";

/**
 * Serves the real SDK projects as ZIP archives.
 *
 * `GET /api/public/sdk/csharp` (a trailing `.zip` is also accepted) streams a
 * complete, versioned SDK project packaged from `sdk-source/`.
 */
async function handle({ params }: { params: { id?: string } }) {
  const id = (params.id ?? "").replace(/\.zip$/i, "").toLowerCase();
  const sdk = SDKS.find((entry) => entry.id === id);

  if (!sdk) {
    return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Unknown SDK." } }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const { buildSdkArchive } = await import("@/lib/sdk-archive.server");
  const folder = `aegis-sdk-${sdk.id}-${sdk.latest}`;
  const archive = buildSdkArchive(sdk.dir, folder);

  if (!archive) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "not_available", message: "SDK source unavailable." } }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(archive as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-length": String(archive.byteLength),
      "content-disposition": `attachment; filename="${folder}.zip"`,
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}

export const Route = createFileRoute("/api/public/sdk/$id")({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
    },
  },
});