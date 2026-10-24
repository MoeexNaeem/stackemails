"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormNote } from "@/components/ui/Modal";
import { SegmentPicker } from "@/components/audience/ContactsToolbar";
import { deleteContactAction, updateContactAction, type AudienceState } from "@/app/(app)/audience-actions";
import { confirmDialog } from "@/components/ui/Confirm";

const initial: AudienceState = { ok: false };

export function ContactEditor({
  contact,
  segments,
  properties,
  topics,
}: {
  contact: { id: string; firstName: string; lastName: string; unsubscribed: boolean; segmentIds: string[]; properties: Record<string, string>; topics: Record<string, boolean> };
  segments: { id: string; name: string }[];
  properties: { key: string; label: string; type: string }[];
  topics: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateContactAction, initial);
  const [deleting, start] = useTransition();

  return (
    <form action={action} className="card p-6 space-y-5">
      <input type="hidden" name="id" value={contact.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" className="input" defaultValue={contact.firstName} maxLength={100} />
        </div>
        <div>
          <label className="label" htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" className="input" defaultValue={contact.lastName} maxLength={100} />
        </div>
      </div>

      <div>
        <span className="label">Segments</span>
        <SegmentPicker segments={segments} selected={contact.segmentIds} />
      </div>

      {properties.length > 0 && (
        <div>
          <p className="label">Properties</p>
          <div className="grid grid-cols-2 gap-3">
            {properties.map((p) => (
              <div key={p.key}>
                <label className="text-xs text-fg-subtle" htmlFor={`prop_${p.key}`}>{p.label} <span className="mono">({p.key})</span></label>
                <input id={`prop_${p.key}`} name={`prop_${p.key}`} className="input mt-1" defaultValue={contact.properties[p.key] ?? ""} type={p.type === "number" ? "number" : "text"} />
              </div>
            ))}
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div>
          <p className="label">Topic subscriptions</p>
          <div className="space-y-1.5">
            {topics.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`topic_${t.id}`} defaultChecked={contact.topics[t.id]} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <input type="checkbox" name="unsubscribed" defaultChecked={contact.unsubscribed} /> Unsubscribed from all marketing email
      </label>

      <FormNote state={state} />
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="btn btn-danger"
          disabled={deleting}
          onClick={async () => {
            if (!(await confirmDialog("Delete this contact? This can't be undone."))) return;
            start(async () => {
              await deleteContactAction(contact.id);
              router.push("/audience");
            });
          }}
        >
          Delete contact
        </button>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}
