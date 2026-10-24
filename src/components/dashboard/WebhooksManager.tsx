"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { CopyButton } from "@/components/CopyButton";
import { createWebhookAction, rotateWebhookSecretAction, type WebhookState } from "@/app/(app)/webhook-actions";
import { confirmDialog } from "@/components/ui/Confirm";

const initial: WebhookState = { ok: false };

export function AddWebhookButton({ events }: { events: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createWebhookAction, initial);
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);
  const groups = events.reduce<Record<string, string[]>>((acc, e) => {
    const g = e.split(".")[0];
    (acc[g] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Add webhook</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add webhook" description="We'll POST signed JSON to this URL. Leave all events unchecked to receive everything." width="max-w-xl">
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="wh-url">Endpoint URL</label>
            <input id="wh-url" name="url" type="url" className="input mono" placeholder="https://api.example.com/webhooks/stackemails" required />
          </div>
          <div className="space-y-3">
            {Object.entries(groups).map(([g, list]) => (
              <fieldset key={g}>
                <legend className="eyebrow mb-1.5 capitalize">{g}</legend>
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map((e) => (
                    <label key={e} className="flex items-center gap-2 text-sm text-fg-muted">
                      <input type="checkbox" name="events" value={e} /> <span className="mono text-xs">{e}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add webhook"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function SigningSecret({ secret }: { secret: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Signing secret</p>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Verify <code className="mono text-xs">X-StackEmails-Signature-V2: t=…,v1=…</code> by computing HMAC-SHA256 of <code className="mono text-xs">{"`${t}.${rawBody}`"}</code> with this secret, comparing in constant time, and rejecting timestamps older than 5 minutes.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={async () => {
            if (!(await confirmDialog("Rotate the signing secret? Your endpoints must use the new secret immediately."))) return;
            start(async () => {
              const r = await rotateWebhookSecretAction();
              setNote(r.message ?? null);
              router.refresh();
            });
          }}
        >
          Rotate
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="mono flex-1 break-all rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
          {show ? secret : `${secret.slice(0, 10)}${"•".repeat(24)}`}
        </code>
        <button className="btn btn-ghost btn-sm" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Reveal"}</button>
        <CopyButton value={secret} />
      </div>
      {note && <p className="mt-2 text-xs text-success">{note}</p>}
    </div>
  );
}
