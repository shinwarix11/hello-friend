import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { CodeBlock } from "@/components/devportal/CodeBlock";
import { DocSection, Prose, StatTile } from "@/components/devportal/parts";
import { Badge } from "@/components/ui/badge";
import { useApplications } from "@/hooks/useApplications";
import { useDeveloperDeliveries } from "@/hooks/useDeveloper";

export const Route = createFileRoute("/_authenticated/developers/webhooks")({
  component: WebhookCentre,
});

const VERIFY_SNIPPET = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyAegisWebhook(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}`;

function WebhookCentre() {
  const { data: apps } = useApplications();
  const appIds = useMemo(() => (apps ?? []).map((a) => a.id), [apps]);
  const { data: deliveries } = useDeveloperDeliveries(appIds);

  const appName = (id: string) => apps?.find((a) => a.id === id)?.name ?? "Unknown";
  const success = (deliveries ?? []).filter((d) => d.status === "success").length;
  const failed = (deliveries ?? []).filter((d) => d.status === "failed").length;
  const pending = (deliveries ?? []).filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Delivered" value={success} icon={CheckCircle2} tone="success" />
        <StatTile label="Failed" value={failed} icon={XCircle} tone={failed ? "destructive" : "default"} />
        <StatTile label="Pending retry" value={pending} icon={Clock} tone={pending ? "warning" : "default"} />
      </div>

      <DocSection
        title="Recent deliveries"
        description="The latest webhook attempts across every application you can access."
      >
        <div className="surface-card overflow-hidden rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Application</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Attempts</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {(deliveries ?? []).map((delivery) => (
                <tr key={delivery.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{delivery.event}</td>
                  <td className="px-3 py-2 text-muted-foreground">{appName(delivery.application_id)}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={
                        delivery.status === "success"
                          ? "border-success/40 text-[10px] uppercase tracking-wider text-success"
                          : delivery.status === "failed"
                            ? "border-destructive/40 text-[10px] uppercase tracking-wider text-destructive"
                            : "border-warning/40 text-[10px] uppercase tracking-wider text-warning"
                      }
                    >
                      {delivery.status}
                      {delivery.response_status ? ` · ${delivery.response_status}` : ""}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{delivery.attempts}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(delivery.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(deliveries?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No deliveries yet. Add an endpoint from an application's Webhooks tab.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Verify signatures" description="Every payload is signed with the endpoint's signing secret.">
        <Prose>
          Aegis sends the HMAC-SHA256 of the raw request body in the <code className="font-mono">x-aegis-signature</code>{" "}
          header. Compare it in constant time and reject anything that does not match before parsing the payload.
        </Prose>
        <CodeBlock code={VERIFY_SNIPPET} language="typescript" filename="verify-webhook.ts" showLineNumbers />
        <p className="text-xs text-muted-foreground">
          Manage endpoints and signing secrets per application in{" "}
          <Link to="/applications" className="text-primary hover:underline">
            Applications → Webhooks
          </Link>
          .
        </p>
      </DocSection>
    </div>
  );
}
