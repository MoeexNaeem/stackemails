import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { getRateLimiter } from "@/lib/ratelimit";
import { logApiRequest } from "@/lib/apiLog";
import { ApiError } from "@/lib/api/errors";
import { randomId } from "@/lib/ids";
import type { ApiKeyDoc, WorkspaceDoc } from "@/lib/db/models";

export type ApiContext<P> = {
  req: Request;
  workspace: WorkspaceDoc;
  apiKey: ApiKeyDoc;
  params: P;
  url: URL;
  /** Parse + validate the JSON body (throws a clean 400/422). */
  body<T>(schema: ZodType<T>): Promise<T>;
};

type Result = { status?: number; data: unknown; headers?: Record<string, string> };

/**
 * Standard wrapper for every public REST endpoint:
 *  - API-key auth (+ suspended/restricted team checks)
 *  - permission scopes: "sending_access" keys may only call send endpoints
 *  - per-key sliding-window rate limit with X-RateLimit-* headers
 *  - request id, uniform JSON error envelope, no internal error leakage
 *  - request/response capture for the dashboard Logs page
 */
export function apiRoute<P = Record<string, never>>(
  opts: { endpoint: string; sending?: boolean; limit?: number },
  handler: (ctx: ApiContext<P>) => Promise<Result>,
) {
  return async (req: Request, routeCtx: { params: Promise<P> }): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = `req_${randomId(16)}`;
    const baseHeaders: Record<string, string> = { "x-request-id": requestId, "cache-control": "no-store" };

    const auth = await authenticateApiRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: { code: auth.code, message: auth.message } }, { status: auth.status, headers: baseHeaders });
    }
    const { workspace, apiKey } = auth;
    let parsedBody: unknown;

    const finish = (status: number, payload: unknown, extra: Record<string, string> = {}) => {
      logApiRequest({ workspace, req, endpoint: opts.endpoint, status, startedAt, apiKey, requestBody: parsedBody, responseBody: payload });
      return NextResponse.json(payload, { status, headers: { ...baseHeaders, ...extra } });
    };

    if (apiKey.permission === "sending_access" && !opts.sending) {
      return finish(403, { error: { code: "restricted_api_key", message: "This API key only has sending access. Use a full access key for this endpoint." } });
    }

    const limit = opts.limit ?? 10;
    const rl = await getRateLimiter().check(`api:${apiKey._id}:${opts.sending ? "send" : "rest"}`, limit, 1000);
    const rlHeaders = { "x-ratelimit-limit": String(rl.limit), "x-ratelimit-remaining": String(rl.remaining), "x-ratelimit-reset": "1" };
    if (!rl.allowed) {
      return finish(429, { error: { code: "rate_limited", message: `Too many requests. This key is limited to ${limit} requests per second.` } }, { ...rlHeaders, "retry-after": "1" });
    }

    try {
      const params = (await routeCtx?.params) ?? ({} as P);
      const res = await handler({
        req,
        workspace,
        apiKey,
        params,
        url: new URL(req.url),
        async body<T>(schema: ZodType<T>) {
          let raw: unknown;
          try {
            raw = await req.json();
          } catch {
            throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
          }
          parsedBody = raw;
          const parsed = schema.safeParse(raw);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const path = issue?.path?.length ? `\`${issue.path.join(".")}\`: ` : "";
            throw new ApiError(422, "validation_error", `${path}${issue?.message ?? "Invalid payload."}`);
          }
          return parsed.data;
        },
      });
      return finish(res.status ?? 200, res.data, { ...rlHeaders, ...(res.headers ?? {}) });
    } catch (err) {
      if (err instanceof ApiError) return finish(err.status, { error: { code: err.code, message: err.message } }, rlHeaders);
      if (err instanceof ZodError) return finish(422, { error: { code: "validation_error", message: err.issues[0]?.message ?? "Invalid input." } }, rlHeaders);
      console.error(`[api] ${req.method} ${opts.endpoint} (${requestId}) unhandled error:`, err);
      return finish(500, { error: { code: "server_error", message: `Something went wrong on our end. Reference: ${requestId}` } }, rlHeaders);
    }
  };
}

/** Throw-helper for handlers. */
export function apiFail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}

/** Cursor pagination helper: ?limit=1..100&after=<id>. */
export function pageParams(url: URL, max = 100) {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), max);
  const after = url.searchParams.get("after") || undefined;
  return { limit, after };
}
