import { ApiLog } from "@/lib/db/models";
import type { ApiKeyDoc, WorkspaceDoc } from "@/lib/db/models";

const MAX_BODY = 8_000;

/** JSON-stringify a body for the Logs page, dropping attachment bytes and anything secret-looking. */
function redact(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  try {
    const s = JSON.stringify(body, (key, value) => {
      if (key === "content" && typeof value === "string" && value.length > 200) return `[${value.length} base64 chars]`;
      if (/password|secret|token|api_?key/i.test(key)) return "[redacted]";
      return value;
    });
    return s.length > MAX_BODY ? `${s.slice(0, MAX_BODY)}…` : s;
  } catch {
    return undefined;
  }
}

export function detectSource(ua: string | undefined): "sdk" | "api" | "smtp" | "mcp" {
  const u = (ua ?? "").toLowerCase();
  if (u.includes("stackemails-smtp")) return "smtp";
  if (u.includes("stackemails-mcp")) return "mcp";
  if (u.includes("stackemails") || u.startsWith("node")) return "sdk";
  return "api";
}

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
  apiKey?: Pick<ApiKeyDoc, "_id"> | null;
  requestBody?: unknown;
  responseBody?: unknown;
}): void {
  const ua = params.req.headers.get("user-agent") ?? undefined;
  ApiLog.create({
    workspaceId: params.workspace._id,
    endpoint: params.endpoint,
    method: params.req.method,
    status: params.status,
    source: detectSource(ua),
    userAgent: ua?.slice(0, 300),
    ip: params.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    durationMs: Date.now() - params.startedAt,
    apiKeyId: params.apiKey?._id,
    requestBody: redact(params.requestBody),
    responseBody: redact(params.responseBody),
  }).catch(() => {});
}
