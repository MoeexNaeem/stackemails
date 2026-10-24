"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendTestEmailAction, type ActionState } from "@/app/(app)/actions";
import { Icon } from "@/components/ui/Icon";

const initial: ActionState = { ok: false };

export function TestEmailComposer({ defaultFrom }: { defaultFrom: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(sendTestEmailAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 900);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Send email
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Send a test email</h2>
              <button className="btn btn-ghost px-2" onClick={() => setOpen(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>

            <form ref={formRef} action={action} className="space-y-3">
              <div>
                <label className="label">From</label>
                <input name="from" className="input" defaultValue={defaultFrom} placeholder="Acme <hello@your-verified-domain.com>" required />
                {!defaultFrom && <p className="mt-1 text-xs text-fg-subtle">Verify a domain first. You can only send from verified domains.</p>}
              </div>
              <div>
                <label className="label">To</label>
                <input
                  name="to"
                  className="input"
                  placeholder="you@yourcompany.com"
                  type="email"
                  required
                />
              </div>
              <div>
                <label className="label">Subject</label>
                <input
                  name="subject"
                  className="input"
                  defaultValue="Hello from Stack Emails"
                  required
                />
              </div>
              <div>
                <label className="label">HTML body</label>
                <textarea
                  name="html"
                  className="input font-mono text-xs"
                  rows={4}
                  defaultValue={"<h1>It works!</h1>\n<p>This email was sent through Stack Emails.</p>"}
                />
              </div>

              {state.error && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" }}
                >
                  {state.error}
                </p>
              )}
              {state.ok && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{ color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
                >
                  Queued! Check the list below.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={pending}>
                  {pending ? "Queuing…" : "Queue email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
