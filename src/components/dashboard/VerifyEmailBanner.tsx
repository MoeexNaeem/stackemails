"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerificationAction } from "@/app/(app)/settings-actions";

const AMBER = { borderColor: "var(--warning, #d97706)", background: "color-mix(in srgb, #d97706 10%, transparent)" };
const GREEN = { borderColor: "var(--lime, #65a30d)", background: "color-mix(in srgb, #65a30d 10%, transparent)" };

/** Shown until the user confirms their email; also reports the result of clicking the link. */
export function VerifyEmailBanner({ email, verified }: { email: string; verified: boolean }) {
  const status = useSearchParams().get("verify");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (verified) {
    if (status !== "done") return null;
    return (
      <div role="status" className="mb-5 rounded-xl border px-4 py-3 text-sm" style={GREEN}>
        <strong>Email confirmed.</strong> You can now add a sending domain.
      </div>
    );
  }

  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={AMBER}>
      <div className="min-w-0">
        {status === "invalid" ? <strong>That confirmation link is invalid or has expired. </strong> : <strong>Confirm your email address. </strong>}
        We sent a link to <span className="font-medium">{email}</span>. You need to confirm it before adding a domain or inviting teammates.
        {msg && <div className="mt-1 text-fg-muted">{msg}</div>}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm shrink-0"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendVerificationAction();
            setMsg(res.ok ? res.message ?? "Sent." : res.error ?? "Something went wrong.");
          })
        }
      >
        {pending ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}
