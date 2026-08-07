import { createFileRoute } from "@tanstack/react-router";

async function handle({ request, params }: { request: Request; params: { _splat?: string } }) {
  const endpoint = (params._splat ?? "").replace(/^\/+|\/+$/g, "");
  try {
    const { handleApiRequest } = await import("@/lib/api-core.server");
    return await handleApiRequest(endpoint, request);
  } catch (error) {
    console.error("[public-api] Unhandled route failure", error);
    return Response.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: "An unexpected error occurred.",
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers":
            "content-type, authorization, user-agent, x-app-key, x-app-name, x-api-key, x-session-token, x-timestamp, x-nonce, x-signature",
          "access-control-allow-methods": "POST, GET, OPTIONS",
          "cache-control": "no-store",
        },
      },
    );
  }
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      POST: handle,
      GET: handle,
      OPTIONS: handle,
    },
  },
});
