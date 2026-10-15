import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";

type RouteHandler<C> = (req: Request, ctx: C) => Promise<Response> | Response;

/**
 * Wrap a REST route handler with uniform error handling. Thrown `ApiError`s
 * become their JSON envelope; anything else is logged and returned as a 500 so
 * internal details never leak to callers.
 */
export function withApi<C = unknown>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.status },
        );
      }
      console.error(`[api] ${req.method} ${new URL(req.url).pathname} — unhandled error:`, err);
      return NextResponse.json(
        { error: { code: "server_error", message: "Something went wrong on our end." } },
        { status: 500 },
      );
    }
  };
}

/** Parse a JSON body or throw a clean 400. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    const { ApiErrors } = await import("@/lib/api/errors");
    throw ApiErrors.invalidJson();
  }
}
