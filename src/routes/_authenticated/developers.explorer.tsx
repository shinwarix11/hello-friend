import { createFileRoute } from "@tanstack/react-router";

import { ApiExplorer } from "@/components/devportal/ApiExplorer";

export const Route = createFileRoute("/_authenticated/developers/explorer")({
  component: ExplorerPage,
});

function ExplorerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">API explorer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compose a request, sign it, and send it against one of your real applications. Responses are live.
        </p>
      </div>
      <ApiExplorer />
    </div>
  );
}
