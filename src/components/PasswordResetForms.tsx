"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      className="text-sm rounded-lg px-3 py-2"
      style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}
    >
      {message}
    </p>
  );
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: { message?: string; error?: { message?: string } } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    try {
      const { ok, data } = await postJson("/api/auth/forgot-password", { email });
      if (!ok) setError(data?.error?.message ?? "Something went wrong.");
      else setSentTo(email);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (sentTo) {
    return (
      <div className="card p-8">
        <h1 className="text-xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-fg-muted">
          If an account exists for <span className="text-fg">{sentTo}</span>, we&apos;ve sent a link to
          reset your password. It expires in 30 minutes.
        </p>
        <p className="mt-2 text-sm text-fg-muted">Don&apos;t see it? Check your spam folder.</p>
        <Link href="/login" className="btn btn-secondary w-full py-2.5 mt-6">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-fg-muted">Enter your email and we&apos;ll send you a reset link.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" placeholder="you@company.com" autoComplete="email" required autoFocus />
        </div>
        {error && <ErrorNote message={error} />}
        <button type="submit" className="btn btn-primary w-full py-2.5" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-sm text-fg-muted text-center">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await postJson("/api/auth/reset-password", { token, password });
      if (!ok) {
        setError(data?.error?.message ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/overview");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return (
      <div className="card p-8">
        <h1 className="text-xl font-semibold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-fg-muted">This link is incomplete or malformed. Request a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary w-full py-2.5 mt-6">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-fg-muted">You&apos;ll be signed out of all other devices.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" name="password" type="password" className="input" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required />
        </div>
        {error && <ErrorNote message={error} />}
        <button type="submit" className="btn btn-primary w-full py-2.5" disabled={loading}>
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>
      {error && (
        <p className="mt-4 text-sm text-fg-muted text-center">
          <Link href="/forgot-password" className="text-accent hover:underline">Request a new link</Link>
        </p>
      )}
    </div>
  );
}
