import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ScrollText, Search } from "lucide-react";

import { DataTable } from "@/components/app/licenses/parts";
import { EmptyState, RowSkeleton, StatCard } from "@/components/app/applications/parts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiUsageLogs, useAuthenticationLogs } from "@/hooks/useLicenses";
import { formatRelative } from "@/lib/applications";
import { AUTH_LOG_LABELS, type AuthLogKind } from "@/lib/licensing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/applications/$appId/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { appId } = Route.useParams();
  const { data: authLogs, isLoading } = useAuthenticationLogs(appId);
  const { data: usage } = useApiUsageLogs(appId);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | AuthLogKind>("all");
  const [onlyFailures, setOnlyFailures] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (authLogs ?? []).filter((l) => {
      if (kind !== "all" && l.kind !== kind) return false;
      if (onlyFailures === "failed" && l.success) return false;
      if (onlyFailures === "success" && !l.success) return false;
      if (!q) return true;
      return (
        (l.message ?? "").toLowerCase().includes(q) ||
        (l.ip_address ?? "").toLowerCase().includes(q) ||
        (l.hwid ?? "").toLowerCase().includes(q)
      );
    });
  }, [authLogs, query, kind, onlyFailures]);

  const failures = (authLogs ?? []).filter((l) => !l.success).length;
  const avgDuration = usage?.length
    ? Math.round(usage.reduce((a, u) => a + u.duration_ms, 0) / usage.length)
    : 0;
  const errorRate = usage?.length
    ? Math.round((usage.filter((u) => u.status_code >= 400).length / usage.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Auth events" value={authLogs?.length ?? 0} icon={Activity} />
        <StatCard label="Failed attempts" value={failures} icon={ScrollText} delay={60} />
        <StatCard label="API calls" value={usage?.length ?? 0} icon={Activity} delay={120} />
        <StatCard
          label="Avg latency"
          value={`${avgDuration}ms`}
          hint={`${errorRate}% error rate`}
          icon={Activity}
          delay={180}
        />
      </div>

      <Tabs defaultValue="auth">
        <TabsList>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="api">API usage</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages, IPs, hardware ids…"
                className="pl-9"
              />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {Object.entries(AUTH_LOG_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={onlyFailures} onValueChange={setOnlyFailures}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="success">Successful</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <RowSkeleton rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No authentication events"
              description="Every SDK call against this application is recorded here in real time."
            />
          ) : (
            <DataTable head={["Event", "Result", "Message", "IP", "Hardware id", "When"]}>
              {rows.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 text-xs font-medium">{AUTH_LOG_LABELS[log.kind]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wider",
                        log.success ? "text-success" : "text-destructive",
                      )}
                    >
                      {log.success ? "success" : "failed"}
                    </span>
                  </td>
                  <td className="max-w-[320px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {log.message ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {log.ip_address ?? "—"}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                    {log.hwid ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatRelative(log.created_at)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          {(usage ?? []).length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No API usage yet"
              description="Requests to the public authentication API appear here with latency and status."
            />
          ) : (
            <DataTable head={["Endpoint", "Method", "Status", "Latency", "IP", "When"]}>
              {(usage ?? []).map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs">{row.endpoint}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.method}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        row.status_code >= 400 ? "text-destructive" : "text-success",
                      )}
                    >
                      {row.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums">{row.duration_ms}ms</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.ip_address ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatRelative(row.created_at)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
