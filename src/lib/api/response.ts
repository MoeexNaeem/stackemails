import { NextResponse } from "next/server";

export function apiJson(data: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(data, { status, headers });
}

/** Consistent error envelope: { error: { code, message } }. */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
