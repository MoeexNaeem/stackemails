"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal, FormNote } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/StatusBadge";
import { createTicketAction, replyTicketAction, type SupportState } from "@/app/(app)/support-actions";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type Ticket = { id: string; number: number; subject: string; status: string; category: string; lastActivityAt: string; messages: { author: string; name: string; body: string; at: string }[] };
const initial: SupportState = { ok: false };

export function HelpCenter({ tickets, faqs }: { tickets: Ticket[]; faqs: { q: string; a: string; category: string }[] }) {
  const [creating, setCreating] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [state, create, pending] = useActionState(createTicketAction, initial);
  const [replyState, reply, replying] = useActionState(replyTicketAction, initial);

  useEffect(() => {
    if (state.ok) setCreating(false);
  }, [state]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs.slice(0, 6);
    return faqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, faqs]);
  const current = tickets.find((t) => t.id === openTicket);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-lg font-normal">Need help with something?</p>
          <p className="text-sm text-fg-muted">Human support team available. We usually reply within one business day.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New ticket</button>
      </div>
      {state.ok && state.message && <p className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", color: "var(--success)" }}>{state.message}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <p className="text-lg font-normal">Knowledge base</p>
          <p className="text-sm text-fg-muted">Answers to frequently asked questions.</p>
          <input className="input input-pill mt-4" placeholder="Search the knowledge base…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the knowledge base" />
          <div className="mt-3 divide-y divide-[var(--border)]">
            {results.length === 0 ? (
              <p className="py-3 text-sm text-fg-subtle">No answers found. Open a ticket and we&apos;ll help.</p>
            ) : (
              results.map((f) => (
                <details key={f.q} className="group py-2.5">
                  <summary className="cursor-pointer list-none text-sm font-medium marker:hidden flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-fg-subtle transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.a}</p>
                </details>
              ))
            )}
          </div>
          <Link href="/blog" className="mt-3 inline-block text-sm text-accent hover:underline">Read guides <Icon name="arrow-up-right" size={14} /></Link>
        </div>
        <div className="card p-6">
          <p className="text-lg font-normal">Stack Emails for agents</p>
          <p className="text-sm text-fg-muted">Connect Claude, Cursor and other agents with the MCP server, SDK and API.</p>
          <div className="mt-4 space-y-2 text-sm">
            <Link href="/settings/integrations" className="block rounded-xl border border-border px-4 py-3 hover:bg-bg-hover">MCP server setup <Icon name="arrow-right" size={14} /></Link>
            <Link href="/docs" className="block rounded-xl border border-border px-4 py-3 hover:bg-bg-hover">API reference <Icon name="arrow-right" size={14} /></Link>
            <Link href="/onboarding" className="block rounded-xl border border-border px-4 py-3 hover:bg-bg-hover">Onboarding & code snippets <Icon name="arrow-right" size={14} /></Link>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <p className="px-6 pt-5 pb-3 text-lg font-normal">Your tickets</p>
        {tickets.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-fg-subtle">You haven&apos;t opened any tickets.</p>
        ) : (
          <table className="table">
            <thead><tr><th>#</th><th>Subject</th><th>Status</th><th className="text-right">Updated</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="cursor-pointer" onClick={() => setOpenTicket(t.id)}>
                  <td className="mono text-fg-subtle">{t.number}</td>
                  <td>{t.subject}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="text-right text-fg-subtle">{timeAgo(t.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New support ticket" description="Include email ids, domains or error codes so we can help faster." width="max-w-xl">
        <form action={create} className="space-y-4">
          <div>
            <label className="label" htmlFor="t-subject">Subject</label>
            <input id="t-subject" name="subject" className="input" required minLength={4} maxLength={160} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="t-cat">Category</label>
              <select id="t-cat" name="category" className="input" defaultValue="general">
                <option value="general">General</option>
                <option value="deliverability">Deliverability</option>
                <option value="domains">Domains & DNS</option>
                <option value="api">API & SDK</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="bug">Bug report</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="t-pri">Priority</label>
              <select id="t-pri" name="priority" className="input" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent: production is down</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="t-body">How can we help?</label>
            <textarea id="t-body" name="body" className="input" rows={6} required minLength={10} maxLength={10000} />
          </div>
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Open ticket"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!current} onClose={() => setOpenTicket(null)} title={current ? `#${current.number} · ${current.subject}` : ""} width="max-w-2xl">
        {current && (
          <div className="space-y-4">
            <div className="max-h-[420px] space-y-3 overflow-y-auto">
              {current.messages.map((m, i) => (
                <div key={i} className="rounded-2xl border border-border p-4" style={{ background: m.author === "staff" ? "color-mix(in srgb, var(--violet) 8%, var(--bg-card))" : "var(--bg-card)" }}>
                  <p className="mb-1 text-xs text-fg-subtle">{m.author === "staff" ? `${m.name || "Stack Emails support"} (staff)` : m.name || "You"} · {new Date(m.at).toLocaleString()}</p>
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                </div>
              ))}
            </div>
            <form action={reply} className="space-y-2">
              <input type="hidden" name="id" value={current.id} />
              <textarea name="body" className="input" rows={3} placeholder="Write a reply…" required />
              <div className="flex items-center justify-between">
                <FormNote state={replyState} />
                <button className="btn btn-primary ml-auto" disabled={replying}>{replying ? "Sending…" : "Reply"}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
