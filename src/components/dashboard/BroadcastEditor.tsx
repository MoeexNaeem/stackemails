"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveBroadcastAction,
  sendBroadcastEntityAction,
  type ActionState,
} from "@/app/(app)/actions";
import { EmailBuilder } from "@/components/dashboard/EmailBuilder";

export type BroadcastEditorData = {
  id: string;
  name: string;
  status: string;
  from: string;
  replyTo: string;
  subject: string;
  previewText: string;
  html: string;
  design: string;
  audienceId: string;
};

const initial: ActionState = { ok: false };

export function BroadcastEditor({
  data,
  audiences,
}: {
  data: BroadcastEditorData;
  audiences: { id: string; name: string; contactCount: number }[];
}) {
  const router = useRouter();
  const [saveState, save, saving] = useActionState(saveBroadcastAction, initial);
  const [sendState, send, sending] = useActionState(sendBroadcastEntityAction, initial);
  const sent = data.status === "sent";

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/broadcasts" className="text-sm text-fg-muted hover:text-fg">← Broadcasts</Link>
          <span className="text-fg-subtle">/</span>
          <span className="font-medium">{data.name || "Untitled"}</span>
          <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
            {sent ? "Sent" : "Draft"}
          </span>
        </div>
        <form action={send} className="flex items-center gap-2">
          <input type="hidden" name="id" value={data.id} />
          {sendState.error && <span className="text-sm" style={{ color: "var(--danger)" }}>{sendState.error}</span>}
          {sendState.ok && !sendState.error && <span className="text-sm" style={{ color: "var(--success)" }}>Queued!</span>}
          <button type="submit" className="btn btn-primary" disabled={sending || sent} onClick={() => setTimeout(() => router.refresh(), 800)}>
            {sent ? "Sent" : sending ? "Sending…" : "Send broadcast"}
          </button>
        </form>
      </div>

      {/* Single form: settings + visual builder */}
      <form action={save}>
        <input type="hidden" name="id" value={data.id} />

        <div className="card p-5 mb-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Broadcast name</label>
            <input name="name" className="input" defaultValue={data.name} placeholder="October newsletter" />
          </div>
          <div>
            <label className="label">Audience</label>
            <select name="audienceId" className="input" defaultValue={data.audienceId}>
              <option value="">Select an audience…</option>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.contactCount})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input name="from" className="input" defaultValue={data.from} placeholder="Acme <hello@acme.com>" />
          </div>
          <div>
            <label className="label">Reply-To</label>
            <input name="replyTo" className="input" defaultValue={data.replyTo} placeholder="optional" />
          </div>
          <div>
            <label className="label">Subject</label>
            <input name="subject" className="input" defaultValue={data.subject} placeholder="Your subject line" />
          </div>
          <div>
            <label className="label">Preview text</label>
            <input name="previewText" className="input" defaultValue={data.previewText} placeholder="Shown in inbox preview" />
          </div>
        </div>

        {/* Visual block builder (renders hidden html + design inputs) */}
        <EmailBuilder initialDesign={data.design} />

        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="btn btn-secondary" disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          {saveState.ok && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
          {saveState.error && <span className="text-sm" style={{ color: "var(--danger)" }}>{saveState.error}</span>}
        </div>
      </form>
    </div>
  );
}
