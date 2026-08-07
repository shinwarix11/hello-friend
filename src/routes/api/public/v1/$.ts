import { createFileRoute } from "@tanstack/react-router";

async function handle({ request, params }: { request: Request; params: { _splat?: string } }) {
  const endpoint = (params._splat ?? "").replace(/^\/+|\/+$/g, "");
  const { handleApiRequest } = await import("@/lib/api-core.server");
  return handleApiRequest(endpoint, request);
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
