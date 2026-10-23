"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { createDomainAction, type DomainState } from "@/app/(app)/domain-actions";

const initial: DomainState = { ok: false };

export function AddDomainForm({ label = "+ Add domain" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [state, action, pending] = useActionState(createDomainAction, initial);

  useEffect(() => {
    if (state.ok && state.id) {
      setOpen(false);
      router.push(`/domains/${state.id}`);
    }
  }, [state, router]);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>{label}</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add domain" description="Use a subdomain like updates.yourcompany.com to isolate your sending reputation.">
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="d-name">Name</label>
            <input id="d-name" name="name" className="input mono" placeholder="updates.example.com" required autoComplete="off" />
          </div>
          <button type="button" className="text-xs text-accent hover:underline" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? "Hide" : "Show"} advanced options
          </button>
          {advanced && (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <label className="label" htmlFor="d-rp">Custom return path</label>
                <input id="d-rp" name="returnPath" className="input mono" defaultValue="send" pattern="[A-Za-z0-9-]{1,32}" />
                <p className="mt-1 text-xs text-fg-subtle">Used for bounce handling and SPF (e.g. send.example.com).</p>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clickTracking" /> Enable click tracking</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="openTracking" /> Enable open tracking</label>
            </div>
          )}
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add domain"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
