import { createElement } from "react";
import { randomBytes } from "node:crypto";
import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/db/connect";
import { Session, User } from "@/lib/db/models";
import { createAccount } from "@/lib/accounts";
import { createSession } from "@/lib/auth/session";
import { issueMfaChallenge } from "@/lib/auth/mfaChallenge";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail, SystemWelcomeEmail } from "@/emails/system";
import { isDisposableEmail, watchSignupSurge } from "@/lib/abuse";
import { containsLink } from "@/lib/abuse-rules";
import { GOOGLE_STATE_COOKIE, decodeState, exchangeGoogleCode, googleEnabled } from "@/lib/auth/google";
import { clientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const to = (path: string) => NextResponse.redirect(new URL(path, env.appUrl));
const fail = (code: string) => to(`/login?error=${code}`);

/** Step 2 of "Continue with Google": verify state, read the Google profile, then sign in or create the account. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = await cookies();
  const saved = decodeState(store.get(GOOGLE_STATE_COOKIE)?.value);
  store.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });

  if (!googleEnabled()) return fail("google_unavailable");
  if (url.searchParams.get("error")) return fail("google_cancelled"); // e.g. the user pressed Cancel on Google's screen
  const code = url.searchParams.get("code");
  if (!saved || !code || url.searchParams.get("state") !== saved.state) return fail("google_state");

  const ip = clientIp(req.headers);
  const rl = await getRateLimiter().check(`google:ip:${ip}`, 30, 15 * 60_000);
  if (!rl.allowed) return fail("rate_limited");

  let profile: Awaited<ReturnType<typeof exchangeGoogleCode>>;
  try {
    profile = await exchangeGoogleCode(code, saved);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "email_unverified") return fail("google_unverified");
    console.error("[google] sign-in failed", err);
    return fail("google_failed");
  }

  await connectToDatabase();
  let user = (await User.findOne({ googleId: profile.sub })) ?? (await User.findOne({ email: profile.email }));
  let isNew = false;

  if (user) {
    if (user.disabled) return fail("account_disabled");
    // This email belongs to an account already tied to a different Google account.
    if (user.googleId && user.googleId !== profile.sub) return fail("google_conflict");
    if (!user.googleId) {
      // First Google sign-in for an existing password account: link it, sign out other
      // sessions (in case someone else knew the password) and tell the owner.
      await User.updateOne({ _id: user._id }, { $set: { googleId: profile.sub, emailVerifiedAt: user.emailVerifiedAt ?? new Date(), ...(profile.picture ? { avatarUrl: profile.picture } : {}) } });
      await Session.deleteMany({ userId: user._id });
      const name = user.name;
      after(() =>
        sendSystemEmail({
          kind: "account_notice",
          to: profile.email,
          subject: "Google sign-in added to your Stack Emails account",
          react: createElement(NoticeEmail, {
            heading: "Google sign-in is now linked",
            paragraphs: [
              `Hi ${name}, your Stack Emails account was just signed in with Google for the first time, so you can now use "Continue with Google" to sign in.`,
              "For your security we signed you out on other devices. If this wasn't you, reset your password and contact support@stackemails.com right away.",
            ],
            cta: { label: "Open dashboard", href: `${env.appUrl}/overview` },
          }),
        }),
      );
    }
  } else {
    if (isDisposableEmail(profile.email)) return fail("google_failed");
    // Same per-network account cap as password signups.
    const limiter = getRateLimiter();
    const [hour, day] = await Promise.all([limiter.check(`signup:ip:h:${ip}`, 3, 3600_000), limiter.check(`signup:ip:d:${ip}`, 5, 24 * 3600_000)]);
    if (!hour.allowed || !day.allowed) return fail("google_failed");
    // A display name carrying a link would end up inside our emails; fall back to the inbox name.
    if (containsLink(profile.name)) profile = { ...profile, name: profile.email.split("@")[0].slice(0, 80) };
    try {
      // Google-only accounts get a random password nobody knows; "Forgot password" lets them set one later.
      await createAccount({ name: profile.name, email: profile.email, password: randomBytes(32).toString("hex") });
    } catch (err) {
      if (!(err && typeof err === "object" && "code" in err && err.code === "email_taken")) {
        console.error("[google] account creation failed", err);
        return fail("google_failed");
      }
    }
    // Google has already verified this address.
    await User.updateOne({ email: profile.email }, { $set: { googleId: profile.sub, emailVerifiedAt: new Date(), ...(profile.picture ? { avatarUrl: profile.picture } : {}) } });
    user = await User.findOne({ email: profile.email });
    if (!user) return fail("google_failed");
    isNew = true;
    after(() => watchSignupSurge(ip));
    after(() =>
      sendSystemEmail({
        kind: "welcome",
        to: profile.email,
        subject: "Welcome to Stack Emails",
        react: createElement(SystemWelcomeEmail, { name: profile.name, dashboardUrl: `${env.appUrl}/emails` }),
      }),
    );
  }

  // Two-factor still applies: hand the browser a short-lived challenge for the code step.
  if (user.mfaEnabled) {
    const params = new URLSearchParams({ mfa: issueMfaChallenge(String(user._id)) });
    if (saved.next) params.set("next", saved.next);
    return to(`/login?${params}`);
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), lastLoginIp: ip } });
  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return to(isNew ? "/onboarding" : saved.next ?? (user.platformRole === "admin" ? "/admin" : "/overview"));
}
