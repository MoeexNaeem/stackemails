"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createDomainAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function AddDomainForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [state, action, pending] = useActionState(createDomainAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Add domain
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)}>
      <form ref={formRef} action={action} className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h2 className="font-semibold text-lg">Add domain</h2>
          <p className="text-sm text-fg-muted mt-1">Use a domain you own to send and receive emails.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" placeholder="mail.acme.com" autoFocus required />
          </div>

          <button type="button" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1" onClick={() => setAdvanced((a) => !a)}>
            <span style={{ transform: advanced ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
            Advanced options
          </button>

          {advanced && (
            <div className="space-y-4 pl-3 border-l border-border">
              <div>
                <label className="label">Region</label>
                <select name="region" className="input" defaultValue="us-east-1">
                  <option value="us-east-1">N. Virginia (us-east-1)</option>
                  <option value="us-west-2">Oregon (us-west-2)</option>
                  <option value="eu-west-1">Ireland (eu-west-1)</option>
                  <option value="eu-north-1">Stockholm (eu-north-1)</option>
                  <option value="ap-northeast-1">Tokyo (ap-northeast-1)</option>
                  <option value="ap-south-1">Mumbai (ap-south-1)</option>
                </select>
              </div>
              <div>
                <label className="label">Custom Return-Path</label>
                <input name="returnPath" className="input" defaultValue="send" />
              </div>
              <div>
                <label className="label">Tracking Subdomain</label>
                <input name="trackingSubdomain" className="input" placeholder="links" />
              </div>
              <div>
                <p className="label">Tracking options</p>
                <label className="flex items-center gap-2 text-sm text-fg-muted">
                  <input type="checkbox" name="clickTracking" defaultChecked className="accent-[var(--accent)]" />
                  Enable click tracking
                </label>
                <label className="flex items-center gap-2 text-sm text-fg-muted mt-1.5">
                  <input type="checkbox" name="openTracking" className="accent-[var(--accent)]" />
                  Enable open tracking
                </label>
              </div>
            </div>
          )}

          {state.error && <p className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "+ Add domain"}</button>
        </div>
      </form>
    </div>
  );
}
