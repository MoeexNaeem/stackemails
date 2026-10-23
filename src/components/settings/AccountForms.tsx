"use client";

import { useActionState, useState, useTransition } from "react";
import { FormNote } from "@/components/ui/Modal";
import { CopyButton } from "@/components/CopyButton";
import {
  changeEmailAction,
  changePasswordAction,
  confirmMfaAction,
  deleteAccountAction,
  disableMfaAction,
  signOutOtherSessionsAction,
  startMfaSetupAction,
  updateNameAction,
  type SettingsState,
} from "@/app/(app)/settings-actions";

const initial: SettingsState = { ok: false };

export function Section({ title, desc, children, danger }: { title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className="card grid gap-6 p-6 md:grid-cols-[260px_1fr]" style={danger ? { borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)" } : undefined}>
      <div>
        <h2 className="font-medium">{title}</h2>
        {desc && <p className="mt-1 text-sm text-fg-muted">{desc}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateNameAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" className="input" defaultValue={name} maxLength={80} required />
      </div>
      <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      <div className="w-full"><FormNote state={state} /></div>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changeEmailAction, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="new-email">Email</label>
        <input id="new-email" name="email" type="email" className="input" defaultValue={email} required />
      </div>
      <div>
        <label className="label" htmlFor="email-pw">Current password</label>
        <input id="email-pw" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <FormNote state={state} />
        <button className="btn btn-secondary ml-auto" disabled={pending}>{pending ? "Saving…" : "Change email"}</button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label" htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">New password</label>
        <input id="pw-new" name="next" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label" htmlFor="pw-conf">Confirm new password</label>
        <input id="pw-conf" name="confirm" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="sm:col-span-3 flex items-center justify-between gap-3">
        <FormNote state={state} />
        <button className="btn btn-secondary ml-auto" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
      </div>
    </form>
  );
}

export function MfaCard({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [confirmState, confirm, confirming] = useActionState(confirmMfaAction, initial);
  const [disableState, disable, disabling] = useActionState(disableMfaAction, initial);
  const [pending, start] = useTransition();
  const codes = confirmState.data?.recoveryCodes as string[] | undefined;

  if (codes) {
    return (
      <div className="space-y-3">
        <FormNote state={confirmState} />
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border-strong p-4 mono text-sm" style={{ background: "var(--bg-elevated)" }}>
          {codes.map((c) => <span key={c}>{c}</span>)}
        </div>
        <CopyButton value={codes.join("\n")} label="Copy recovery codes" />
      </div>
    );
  }

  if (enabled) {
    return (
      <form action={disable} className="space-y-3">
        <p className="text-sm"><span className="badge delta-up">Enabled</span> <span className="text-fg-muted">You'll be asked for a code from your authenticator app when signing in.</span></p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="label" htmlFor="mfa-pw">Password to turn off</label>
            <input id="mfa-pw" name="password" type="password" className="input" required />
          </div>
          <button className="btn btn-danger" disabled={disabling}>{disabling ? "…" : "Disable MFA"}</button>
        </div>
        <FormNote state={disableState} />
      </form>
    );
  }

  if (setup) {
    return (
      <form action={confirm} className="space-y-4">
        <div className="flex flex-wrap items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl bg-white p-2" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <p>1. Scan the QR code with Google Authenticator, 1Password, Authy or similar.</p>
            <p className="text-fg-muted">Can&apos;t scan? Enter this key manually:</p>
            <div className="flex items-center gap-2"><code className="mono break-all text-xs">{setup.secret}</code><CopyButton value={setup.secret} className="!px-1.5 !py-0.5" /></div>
            <p>2. Enter the 6-digit code the app shows.</p>
            <input name="code" className="input mono w-40 text-center tracking-[0.3em]" inputMode="numeric" maxLength={6} placeholder="000000" required autoFocus aria-label="Authentication code" />
          </div>
        </div>
        <FormNote state={confirmState} />
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={confirming}>{confirming ? "Verifying…" : "Turn on MFA"}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setSetup(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <button
      className="btn btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await startMfaSetupAction();
          if (r.data) setSetup(r.data as { secret: string; qr: string });
        })
      }
    >
      {pending ? "Preparing…" : "Enable MFA"}
    </button>
  );
}

export function SessionsCard({ count }: { count: number }) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-fg-muted">You&apos;re signed in on {count} device{count === 1 ? "" : "s"}.</p>
      <div className="flex items-center gap-3">
        {note && <span className="text-xs text-success">{note}</span>}
        <button className="btn btn-secondary" disabled={pending || count <= 1} onClick={() => start(async () => setNote((await signOutOtherSessionsAction()).message ?? null))}>Sign out other devices</button>
      </div>
    </div>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <p className="sm:col-span-2 text-sm text-fg-muted">Deletes your account and every team you own (domains, emails, contacts, API keys). This can&apos;t be undone.</p>
      <div>
        <label className="label" htmlFor="del-confirm">Type <span className="mono">{email}</span></label>
        <input id="del-confirm" name="confirm" className="input" autoComplete="off" required />
      </div>
      <div>
        <label className="label" htmlFor="del-pw">Password</label>
        <input id="del-pw" name="password" type="password" className="input" required />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <FormNote state={state} />
        <button className="btn btn-danger ml-auto" disabled={pending}>{pending ? "Deleting…" : "Delete account"}</button>
      </div>
    </form>
  );
}
