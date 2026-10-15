import { ApiLog } from "@/lib/db/models";
import type { WorkspaceDoc } from "@/lib/db/models";

/**
 * Record a REST API request for the Logs page. Fire-and-forget: never blocks or
 * throws into the request path.
 */
export function logApiRequest(params: {
  workspace: WorkspaceDoc;
  req: Request;
  endpoint: string;
  status: number;
  startedAt: number;
}): void {
  const ua = params.req.headers.get("user-agent") ?? undefined;
  const source = ua?.toLowerCase().includes("node") || ua?.toLowerCase().includes("nanosend")
    ? "sdk"
    : "api";
  ApiLog.create({
    workspaceId: params.workspace._id,
    endpoint: params.endpoint,
    method: params.req.method,
    status: params.status,
    source,
    userAgent: ua,
    durationMs: Date.now() - params.startedAt,
  }).catch(() => {});
}
