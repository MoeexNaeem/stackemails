"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/Icon";
import { startNavigationProgress } from "@/components/ui/RouteProgress";
import { toast } from "@/lib/toast";

async function post(url: string, payload: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** Only allow same-site relative redirects (no open redirect via ?next=). */
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

const GOOGLE_ERRORS: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "Your Google sign-in session expired. Please try again.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
  google_unverified: "Your Google account's email address isn't verified, so we can't use it to sign in.",
  google_conflict: "This email is already linked to a different Google account. Sign in with your password instead.",
  google_unavailable: "Sign in with Google isn't available right now. Use your email and password.",
  account_disabled: "This account has been disabled. Contact support@stackemails.com.",
  rate_limited: "Too many sign-in attempts. Wait 15 minutes and try again.",
};

export function AuthForm({ mode, google = false }: { mode: "login" | "signup"; google?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const urlError = params.get("error");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? GOOGLE_ERRORS[urlError] ?? "Something went wrong. Please try again." : null);
  // Google sign-in for an account with two-factor auth lands here with ?mfa=<challenge>.
  const [challenge, setChallenge] = useState<string | null>(params.get("mfa"));
  const [useRecovery, setUseRecovery] = useState(false);

  useEffect(() => {
    if (!urlError && !params.get("mfa")) return;
    if (urlError) toast.error(GOOGLE_ERRORS[urlError] ?? "Something went wrong. Please try again.");
    // Drop ?error / ?mfa from the address bar so a refresh doesn't repeat them.
    const clean = new URLSearchParams(params.toString());
    clean.delete("error");
    clean.delete("mfa");
    const qs = clean.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function continueWithGoogle() {
    setGoogleLoading(true);
    const q = new URLSearchParams({ from: mode });
    if (next) q.set("next", next);
    window.location.assign(`/api/auth/google?${q}`);
  }

  function go(to?: string) {
    startNavigationProgress();
    router.push(next ?? to ?? "/overview");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (challenge) {
        const { ok, data } = await post("/api/auth/mfa", { challenge, code: payload.code });
        if (!ok) {
          if (data?.error?.code === "challenge_expired") setChallenge(null);
          { const msg = data?.error?.message ?? "Invalid code."; setError(msg); toast.error(msg); }
          setLoading(false);
          return;
        }
        return go(data.redirect);
      }
      const { ok, data } = await post(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", payload);
      if (!ok) {
        { const msg = data?.error?.message ?? "Something went wrong."; setError(msg); toast.error(msg); }
        setLoading(false);
        return;
      }
      if (data.mfa_required) {
        setChallenge(data.challenge);
        setLoading(false);
        return;
      }
      go(mode === "signup" ? "/onboarding" : data.redirect);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (challenge) {
    return (
      <div className="card p-8">
        <h1 className="text-xl font-medium">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-fg-muted">{useRecovery ? "Enter one of your recovery codes." : "Enter the 6-digit code from your authenticator app."}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            name="code"
            className="input mono text-center text-lg tracking-[0.3em]"
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={useRecovery ? "xxxxx-xxxxx" : "000000"}
            maxLength={useRecovery ? 11 : 6}
            autoFocus
            required
            aria-label="Authentication code"
          />
          {error && <ErrorNote text={error} />}
          <button type="submit" className="btn btn-primary w-full h-10" disabled={loading}>{loading ? <><Spinner /> Verifying</> : "Verify"}</button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-accent hover:underline" onClick={() => setUseRecovery((r) => !r)}>
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-medium">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-1 text-sm text-fg-muted">{mode === "signup" ? "Start sending email in minutes. Free forever up to 3,000 emails a month." : "Sign in to your Stack Emails dashboard."}</p>

      {google && (
        <>
          <button type="button" onClick={continueWithGoogle} disabled={googleLoading || loading} className="btn btn-secondary mt-6 h-10 w-full gap-2.5">
            {googleLoading ? <Spinner /> : <GoogleIcon />}
            {googleLoading ? "Redirecting to Google" : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
          </button>
          <div className="mt-5 flex items-center gap-3 text-xs text-fg-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--border)]" />
            or {mode === "signup" ? "sign up" : "sign in"} with email
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={`${google ? "mt-5" : "mt-6"} space-y-4`}>
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" className="input" placeholder="Ada Lovelace" autoComplete="name" required maxLength={80} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" placeholder="you@company.com" autoComplete="email" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            {mode === "login" && <Link href="/forgot-password" className="text-xs text-accent hover:underline mb-1.5">Forgot password?</Link>}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
        </div>
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="workspaceName">Team name <span className="text-fg-subtle">(optional)</span></label>
            <input id="workspaceName" name="workspaceName" className="input" placeholder="Acme Inc." maxLength={80} />
          </div>
        )}
        {error && <ErrorNote text={error} />}
        <button type="submit" className="btn btn-primary w-full h-10" disabled={loading}>
          {loading ? <><Spinner /> {mode === "signup" ? "Creating your account" : "Signing in"}</> : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        {mode === "signup" && (
          <p className="text-center text-xs text-fg-subtle">
            By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {mode === "signup" ? (
          <>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></>
        ) : (
          <>New to Stack Emails? <Link href="/signup" className="text-accent hover:underline">Create an account</Link></>
        )}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="rounded-xl px-3 py-2 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
      {text}
    </p>
  );
}
