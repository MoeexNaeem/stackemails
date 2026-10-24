"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkContactsAction } from "@/app/(app)/audience-actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { confirmDialog } from "@/components/ui/Confirm";

type Row = { id: string; email: string; name: string; unsubscribed: boolean; segments: string[]; createdAt: string };

export function ContactsTable({ rows, segments, filtered }: { rows: Row[]; segments: { id: string; name: string }[]; filtered: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [segment, setSegment] = useState(segments[0]?.id ?? "");
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function run(op: Parameters<typeof bulkContactsAction>[1]) {
    if (op === "delete" && !(await confirmDialog(`Delete ${selected.size} contact(s)? This can't be undone.`))) return;
    start(async () => {
      const res = await bulkContactsAction([...selected], op, segment);
      setNote(res.error ?? res.message ?? null);
      if (res.ok) setSelected(new Set());
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
          title={filtered ? "No contacts match these filters" : "No contacts yet"}
          description={filtered ? "Try a different search or filter." : "Add contacts to manage, segment, and reach your audience."}
        />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 text-sm" style={{ background: "var(--bg-hover)" }}>
          <span className="font-medium">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-border-strong" />
          {segments.length > 0 && (
            <>
              <select className="input input-pill h-8 w-auto text-xs" value={segment} onChange={(e) => setSegment(e.target.value)} aria-label="Segment">
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("add_segment")}>Add to segment</button>
              <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("remove_segment")}>Remove from segment</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("unsubscribe")}>Unsubscribe</button>
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("subscribe")}>Resubscribe</button>
          <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("delete")}>Delete</button>
          {note && <span className="text-xs text-fg-muted">{note}</span>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} />
              </th>
              <th>Email</th>
              <th>Name</th>
              <th>Segments</th>
              <th>Status</th>
              <th className="text-right">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input type="checkbox" aria-label={`Select ${r.email}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td className="max-w-[260px] truncate">
                  <Link href={`/audience/contacts/${r.id}`} className="hover:text-accent">{r.email}</Link>
                </td>
                <td className="text-fg-muted">{r.name || "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {r.segments.slice(0, 3).map((s) => <span key={s} className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{s}</span>)}
                    {r.segments.length > 3 && <span className="text-xs text-fg-subtle">+{r.segments.length - 3}</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge ${r.unsubscribed ? "delta-down" : "delta-up"}`}>{r.unsubscribed ? "Unsubscribed" : "Subscribed"}</span>
                </td>
                <td className="text-right text-fg-subtle whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
