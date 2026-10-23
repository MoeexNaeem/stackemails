"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Modal, FormNote } from "@/components/ui/Modal";
import { createInboxAction, type InboxState } from "@/app/(app)/inbox-actions";

const initial: InboxState = { ok: false };

export function CreateInboxButton({ domains }: { domains: { id: string; name: string; receiving: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [state, action, pending] = useActionState(createInboxAction, initial);
  const domain = domains.find((d) => d.id === domainId);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Create inbox</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create inbox" description="A dedicated address for sending and receiving emails.">
        {domains.length === 0 ? (
          <div className="rounded-xl border border-border p-4 text-sm" style={{ background: "color-mix(in srgb, var(--info) 8%, transparent)" }}>
            You need a verified domain for sending to create an inbox.{" "}
            <Link href="/domains" className="text-accent underline">Verify domain</Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div>
              <label className="label" htmlFor="ib-name">Name</label>
              <input id="ib-name" name="name" className="input" placeholder="Support" maxLength={80} />
            </div>
            <div>
              <span className="label">Address</span>
              <div className="flex items-center gap-2">
                <input name="local" className="input" placeholder="support" required aria-label="Address" />
                <span className="text-fg-subtle">@</span>
                <select name="domainId" className="input" value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label="Domain">
                  {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="label">{domain?.receiving ? "Receiving" : `${domain?.name ?? "This domain"} is only verified for sending. How would you like to proceed?`}</legend>
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer has-[:checked]:border-[var(--violet)]">
                <input type="radio" name="receiveMode" value="alias" defaultChecked className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Use a receiving address</span>
                  <span className="block text-xs text-fg-subtle">No setup. Stack Emails gives this inbox its own address; replies come back here.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer has-[:checked]:border-[var(--violet)]">
                <input type="radio" name="receiveMode" value="domain" className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Enable receiving on the domain</span>
                  <span className="block text-xs text-fg-subtle">Email sent to this domain comes to Stack Emails. Add the MX record shown on the domain page.</span>
                </span>
              </label>
            </fieldset>
            <FormNote state={state} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel <span className="kbd ml-1">Esc</span></button>
              <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
