"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormNote } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteInboxAction, sendFromInboxAction, type InboxState } from "@/app/(app)/inbox-actions";
import { timeAgo } from "@/lib/format";

type Thread = { id: string; subject: string; from: string; snippet: string; at: string; count: number; unread: number };
type Message = { id: string; direction: string; from: string; to: string; subject: string; text: string; html: string | null; at: string };
const initial: InboxState = { ok: false };

export function InboxView({ inbox, threads, activeThread, messages, compose }: { inbox: { id: string; name: string; address: string }; threads: Thread[]; activeThread: string | null; messages: Message[]; compose: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(sendFromInboxAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="card grid min-h-[560px] overflow-hidden md:grid-cols-[320px_1fr]">
      <aside className="border-b border-border md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <Link href={`/inboxes/${inbox.id}?compose=1`} className="btn btn-primary btn-sm">✎ Compose</Link>
          <button
            className="btn btn-ghost btn-sm text-xs"
            disabled={deleting}
            onClick={() => {
              if (confirm(`Delete the inbox ${inbox.address}? Messages stay in Emails → Receiving.`)) startDelete(() => deleteInboxAction(inbox.id));
            }}
          >
            Delete inbox
          </button>
        </div>
        {threads.length === 0 ? (
          <p className="p-5 text-sm text-fg-subtle">No conversations yet. Send a test email to this inbox to see one here.</p>
        ) : (
          <ul className="max-h-[620px] overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/inboxes/${inbox.id}?t=${t.id}`}
                  className="block border-b border-border px-4 py-3 hover:bg-bg-hover"
                  style={{ background: t.id === activeThread ? "var(--bg-hover)" : undefined }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${t.unread ? "font-semibold" : ""}`}>{t.from}</span>
                    <span className="shrink-0 text-[11px] text-fg-subtle">{timeAgo(t.at)}</span>
                  </div>
                  <p className="truncate text-[13px]">{t.subject}{t.count > 1 && <span className="text-fg-subtle"> ({t.count})</span>}</p>
                  <p className="truncate text-xs text-fg-subtle">{t.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="flex min-w-0 flex-col">
        {compose || !activeThread ? (
          compose ? (
            <form ref={formRef} action={action} className="flex flex-1 flex-col gap-3 p-5">
              <input type="hidden" name="inboxId" value={inbox.id} />
              <p className="text-sm text-fg-muted">New message from <span className="mono">{inbox.address}</span></p>
              <input name="to" type="email" className="input" placeholder="To" required />
              <input name="subject" className="input" placeholder="Subject" required maxLength={300} />
              <textarea name="body" className="input flex-1 min-h-[240px]" placeholder="Write your message…" required />
              <FormNote state={state} />
              <div className="flex justify-end"><button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send"}</button></div>
            </form>
          ) : (
            <EmptyState title="Select a conversation" description="Pick a thread on the left, or compose a new message." />
          )
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <p className="text-lg font-normal">{messages[0]?.subject}</p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((m) => (
                <article key={m.id} className="rounded-2xl border border-border p-4" style={{ background: m.direction === "outbound" ? "color-mix(in srgb, var(--violet) 6%, var(--bg-card))" : "var(--bg-elevated)" }}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
                    <span><span className="text-fg">{m.from}</span> → {m.to}</span>
                    <span>{new Date(m.at).toLocaleString()}</span>
                  </div>
                  {m.html ? (
                    <iframe title={`Message ${m.id}`} sandbox="" srcDoc={m.html} className="w-full rounded-lg bg-white" style={{ height: 260, border: 0 }} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-fg-muted">{m.text}</p>
                  )}
                </article>
              ))}
            </div>
            <form ref={formRef} action={action} className="border-t border-border p-4">
              <input type="hidden" name="inboxId" value={inbox.id} />
              <input type="hidden" name="threadId" value={activeThread} />
              <textarea name="body" className="input min-h-[96px]" placeholder={`Reply as ${inbox.address}…`} required />
              <div className="mt-2 flex items-center justify-between gap-3">
                <FormNote state={state} />
                <button className="btn btn-primary ml-auto" disabled={pending}>{pending ? "Sending…" : "Reply"}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
