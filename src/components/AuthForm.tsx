"use client";

import { useState } from "react";
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

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);

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

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="rounded-xl px-3 py-2 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}>
      {text}
    </p>
  );
}
