import type { Metadata } from "next";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { ContactMessage } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { setMessageStatusAction } from "@/app/admin/ops-actions";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

type SP = { q?: string; status?: string; topic?: string; page?: string; id?: string };

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  await connectToDatabase();
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const filter: Record<string, unknown> = {};
  if (sp.status && ["new", "replied", "archived"].includes(sp.status)) filter.status = sp.status;
  else filter.status = { $ne: "archived" };
  if (sp.topic && ["sales", "support", "partnership", "press", "other"].includes(sp.topic)) filter.topic = sp.topic;
  const q = sp.q?.trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { message: rx }];
  }
  const [total, rows, selected] = await Promise.all([
    ContactMessage.countDocuments(filter),
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    sp.id && isValidObjectId(sp.id) ? ContactMessage.findById(sp.id).lean() : null,
  ]);
  const current = selected ?? rows[0] ?? null;
  const keep = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "id" && v) as [string, string][]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Messages</h1>
        <p className="mt-1 text-sm text-fg-muted">Enquiries from the public contact form.</p>
      </div>
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search name, email, company or text…" },
          { type: "select", name: "status", options: [{ value: "", label: "Inbox (not archived)" }, { value: "new", label: "New" }, { value: "replied", label: "Replied" }, { value: "archived", label: "Archived" }] },
          { type: "select", name: "topic", options: [{ value: "", label: "All topics" }, { value: "sales", label: "Sales" }, { value: "support", label: "Support" }, { value: "partnership", label: "Partnership" }, { value: "press", label: "Press" }, { value: "other", label: "Other" }] },
        ]}
      />
      {rows.length === 0 && !current ? (
        <div className="card"><EmptyState title="No messages" description="Submissions from stackemails.com/contact appear here." /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <ul className="card max-h-[70vh] overflow-y-auto">
            {rows.map((m) => {
              const active = current && String(current._id) === String(m._id);
              keep.set("id", String(m._id));
              return (
                <li key={String(m._id)} className="border-b border-border last:border-0">
                  <Link href={`/admin/messages?${keep}`} className="block px-4 py-3 hover:bg-bg-hover" style={active ? { background: "var(--bg-hover)" } : undefined}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{m.name}{m.company ? ` · ${m.company}` : ""}</span>
                      <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(m.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                      {m.status === "new" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--violet)" }} />}
                      <span className="capitalize">{m.topic}</span>
                      <span className="truncate">{m.message}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {current && (
            <article className="card space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg">{current.name}</h2>
                  <p className="text-sm text-fg-muted"><a className="hover:text-fg" href={`mailto:${current.email}`}>{current.email}</a>{current.company ? ` · ${current.company}` : ""}</p>
                  <p className="mt-1 text-xs text-fg-subtle"><span className="capitalize">{current.topic}</span>{current.volume ? ` · volume ${current.volume}` : ""} · {new Date(current.createdAt).toLocaleString()}{current.ip ? ` · ${current.ip}` : ""}</p>
                </div>
                <span className="badge capitalize">{current.status}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.message}</p>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <a className="btn btn-primary btn-sm" href={`mailto:${current.email}?subject=${encodeURIComponent("Re: your message to Stack Emails")}`}>Reply by email</a>
                {current.status !== "replied" && <form action={setMessageStatusAction.bind(null, String(current._id), "replied")}><button className="btn btn-secondary btn-sm">Mark replied</button></form>}
                {current.status !== "archived" ? (
                  <form action={setMessageStatusAction.bind(null, String(current._id), "archived")}><button className="btn btn-secondary btn-sm">Archive</button></form>
                ) : (
                  <form action={setMessageStatusAction.bind(null, String(current._id), "new")}><button className="btn btn-secondary btn-sm">Move to inbox</button></form>
                )}
              </div>
            </article>
          )}
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
