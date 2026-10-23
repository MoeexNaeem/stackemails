"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveBroadcastAction,
  sendBroadcastEntityAction,
  sendBroadcastTestAction,
  deleteBroadcastAction,
  type ActionState,
} from "@/app/(app)/actions";
import { EmailBuilder } from "@/components/dashboard/EmailBuilder";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { pct } from "@/lib/format";

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
  topicId: string;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: { recipients: number; delivered: number; opened: number; clicked: number };
};

const initial: ActionState = { ok: false };

export function BroadcastEditor({
  data,
  audiences,
  topics,
  mergeTags,
  userEmail,
  hasVerifiedDomain,
}: {
  data: BroadcastEditorData;
  audiences: { id: string; name: string; contactCount: number }[];
  topics: { id: string; name: string }[];
  mergeTags: string[];
  userEmail: string;
  hasVerifiedDomain: boolean;
}) {
  const router = useRouter();
  const [saveState, save, saving] = useActionState(saveBroadcastAction, initial);
  const [sendState, send, sending] = useActionState(sendBroadcastEntityAction, initial);
  const [testState, test, testing] = useActionState(sendBroadcastTestAction, initial);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [segment, setSegment] = useState(data.audienceId);
  const [when, setWhen] = useState("");
  const editable = data.status === "draft";
  const seg = audiences.find((a) => a.id === segment);

  useEffect(() => {
    if (sendState.ok) router.refresh();
  }, [sendState, router]);

  if (!editable) {
    return (
      <div>
        <Link href="/broadcasts" className="text-sm text-fg-subtle hover:text-fg">← Broadcasts</Link>
        <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-normal tracking-tight">{data.name}</h1>
          <StatusBadge status={data.status} />
          <span className="text-sm text-fg-subtle">{data.status === "scheduled" && data.scheduledAt ? `Sends ${new Date(data.scheduledAt).toLocaleString()}` : data.sentAt ? `Sent ${new Date(data.sentAt).toLocaleString()}` : ""}</span>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Recipients" value={data.stats.recipients.toLocaleString()} />
          <StatCard label="Delivered" value={pct(data.stats.delivered, data.stats.recipients)} hint={`${data.stats.delivered.toLocaleString()} emails`} />
          <StatCard label="Opened" value={pct(data.stats.opened, data.stats.recipients)} hint={`${data.stats.opened.toLocaleString()} unique opens`} />
          <StatCard label="Clicked" value={pct(data.stats.clicked, data.stats.recipients)} hint={`${data.stats.clicked.toLocaleString()} unique clicks`} />
        </div>
        <div className="card p-6 text-sm space-y-2">
          <p><span className="text-fg-subtle">From:</span> {data.from}</p>
          <p><span className="text-fg-subtle">Subject:</span> {data.subject}</p>
          <p><span className="text-fg-subtle">Segment:</span> {audiences.find((a) => a.id === data.audienceId)?.name ?? "—"}{data.topicId ? ` · Topic: ${topics.find((t) => t.id === data.topicId)?.name ?? ""}` : ""}</p>
          <Link href={`/emails?q=&key=broadcast`} className="inline-block text-accent hover:underline">View individual emails →</Link>
        </div>
        <div className="card mt-6 overflow-hidden">
          <iframe title="Broadcast content" sandbox="" srcDoc={data.html} className="w-full bg-white" style={{ height: 560, border: 0 }} />
        </div>
      </div>
    );
  }

  return (
    <form action={save}>
      <input type="hidden" name="id" value={data.id} />
      <input type="hidden" name="mode" value={mode} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/broadcasts" className="text-sm text-fg-subtle hover:text-fg">← Broadcasts</Link>
          <StatusBadge status="draft" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveState.ok && <span className="text-xs text-success">Saved.</span>}
          {(saveState.error || sendState.error) && <span className="text-xs text-danger">{saveState.error || sendState.error}</span>}
          {sendState.ok && sendState.secret && <span className="text-xs text-success">{sendState.secret}</span>}
          <button type="submit" className="btn btn-secondary" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
          <button
            type="submit"
            formAction={send}
            className="btn btn-primary"
            disabled={sending || !hasVerifiedDomain}
            onClick={(e) => {
              if (!confirm(mode === "schedule" ? "Schedule this broadcast?" : `Send to ${seg ? seg.contactCount.toLocaleString() : "0"} subscribed contacts now?`)) e.preventDefault();
            }}
          >
            {sending ? "Sending…" : mode === "schedule" ? "Schedule" : "Send now"}
          </button>
        </div>
      </div>

      {!hasVerifiedDomain && (
        <p className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--warning)" }}>
          Verify a domain before sending broadcasts. <Link href="/domains" className="underline">Go to Domains</Link>
        </p>
      )}

      <div className="card mb-4 grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="b-name">Name</label>
          <input id="b-name" name="name" className="input" defaultValue={data.name} placeholder="October newsletter" maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="b-seg">Send to segment</label>
          <select id="b-seg" name="audienceId" className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">Select a segment…</option>
            {audiences.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.contactCount.toLocaleString()} subscribed)</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-from">From</label>
          <input id="b-from" name="from" className="input" defaultValue={data.from} placeholder="Acme <hello@acme.com>" />
        </div>
        <div>
          <label className="label" htmlFor="b-topic">Topic <span className="text-fg-subtle">(optional)</span></label>
          <select id="b-topic" name="topicId" className="input" defaultValue={data.topicId}>
            <option value="">No topic — everyone subscribed</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="b-subject">Subject</label>
          <input id="b-subject" name="subject" className="input" defaultValue={data.subject} placeholder="What's new this month" maxLength={998} />
        </div>
        <div>
          <label className="label" htmlFor="b-reply">Reply-To</label>
          <input id="b-reply" name="replyTo" className="input" defaultValue={data.replyTo} placeholder="optional" />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="b-pre">Preview text</label>
          <input id="b-pre" name="previewText" className="input" defaultValue={data.previewText} placeholder="Shown after the subject in the inbox" maxLength={200} />
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <div className="tabs">
            <button type="button" className="tab" data-active={mode === "now"} onClick={() => setMode("now")}>Send now</button>
            <button type="button" className="tab" data-active={mode === "schedule"} onClick={() => setMode("schedule")}>Schedule</button>
          </div>
          {mode === "schedule" && (
            <>
              {/* datetime-local has no timezone; send an absolute ISO time so the server schedules correctly. */}
              <input type="datetime-local" className="input w-auto" required onChange={(e) => setWhen(e.target.value ? new Date(e.target.value).toISOString() : "")} aria-label="Send at" />
              <input type="hidden" name="scheduledAt" value={when} />
              <span className="text-xs text-fg-subtle">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </>
          )}
          <span className="text-xs text-fg-subtle">Merge tags: {mergeTags.map((t) => `{{${t}}}`).join(", ")}</span>
        </div>
      </div>

      <EmailBuilder initialDesign={data.design} />

      <div className="card mt-4 flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm text-fg-muted">Send a test to</span>
        <input name="testTo" type="email" className="input w-64" defaultValue={userEmail} aria-label="Test recipient" />
        <button type="submit" formAction={test} className="btn btn-secondary" disabled={testing}>{testing ? "Sending…" : "Send test"}</button>
        {testState.ok && <span className="text-xs text-success">{testState.secret}</span>}
        {testState.error && <span className="text-xs text-danger">{testState.error}</span>}
        <button
          type="button"
          className="btn btn-ghost ml-auto text-danger"
          onClick={async () => {
            if (!confirm("Delete this draft?")) return;
            await deleteBroadcastAction(data.id);
            router.push("/broadcasts");
          }}
        >
          Delete draft
        </button>
      </div>
    </form>
  );
}
