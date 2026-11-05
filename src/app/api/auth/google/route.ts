import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { GOOGLE_STATE_COOKIE, encodeState, googleAuthUrl, googleEnabled, newGoogleOAuthState } from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1 of "Continue with Google": remember state + PKCE verifier, then send the browser to Google. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") === "signup" ? "/signup" : "/login";
  if (!googleEnabled()) return NextResponse.redirect(new URL(`${from}?error=google_unavailable`, env.appUrl));

  const rawNext = url.searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : null;
  const s = newGoogleOAuthState(next);

  (await cookies()).set(GOOGLE_STATE_COOKIE, encodeState(s), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax", // sent on the top-level redirect back from Google
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(googleAuthUrl(s));
}
