"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteAutomationAction, saveAutomationAction, toggleAutomationAction } from "@/app/(app)/automation-actions";

type WaitStep = { type: "wait"; waitDuration: number; waitUnit: "minutes" | "hours" | "days" };
type EmailStep = { type: "email"; from: string; subject: string; html: string };
type Step = WaitStep | EmailStep;
type Model = { name: string; trigger: "contact.added" | "event"; audienceId: string; eventName: string; steps: Step[] };

export function AutomationEditor({
  id,
  status,
  stats,
  initial,
  segments,
  events,
  defaultFrom,
  templates,
}: {
  id: string;
  status: string;
  stats: { entered: number; completed: number };
  initial: Model;
  segments: { id: string; name: string }[];
  events: string[];
  defaultFrom: string;
  templates: { id: string; name: string; subject: string; html: string }[];
}) {
  const router = useRouter();
  const [m, setM] = useState<Model>(initial);
  const [open, setOpen] = useState<number | null>(initial.steps.findIndex((s) => s.type === "email"));
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const update = (fn: (draft: Model) => Model) => {
    setM((prev) => fn(structuredClone(prev)));
    setDirty(true);
    setNote(null);
  };
  const setStep = (i: number, patch: Partial<WaitStep> | Partial<EmailStep>) => update((d) => ({ ...d, steps: d.steps.map((s, j) => (j === i ? ({ ...s, ...patch } as Step) : s)) }));
  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.steps.length) return d;
      [d.steps[i], d.steps[j]] = [d.steps[j], d.steps[i]];
      return d;
    });

  function save(then?: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    start(async () => {
      const res = await saveAutomationAction(id, m);
      if (!res.ok) return setNote({ ok: false, text: res.error ?? "Couldn't save." });
      setDirty(false);
      if (then) {
        const r2 = await then();
        setNote({ ok: r2.ok, text: r2.error ?? r2.message ?? "" });
      } else setNote({ ok: true, text: "Saved." });
      router.refresh();
    });
  }

  const active = status === "active";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/automations" className="text-sm text-fg-subtle hover:text-fg">← Automations</Link>
          <input
            value={m.name}
            onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
            className="min-w-0 bg-transparent text-xl font-normal outline-none border-b border-transparent focus:border-border-strong"
            aria-label="Automation name"
            maxLength={120}
          />
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-2">
          {note && <span className="text-xs" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</span>}
          <button className="btn btn-secondary" disabled={pending || !dirty} onClick={() => save()}>{dirty ? "Save" : "Saved"}</button>
          <button className={active ? "btn btn-secondary" : "btn btn-primary"} disabled={pending} onClick={() => save(() => toggleAutomationAction(id))}>
            {active ? "Pause" : "Save & activate"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="mx-auto w-full max-w-xl">
          {/* Trigger */}
          <Node accent="var(--violet)" label="Trigger">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="trigger">When</label>
                <select id="trigger" className="input" value={m.trigger} onChange={(e) => update((d) => ({ ...d, trigger: e.target.value as Model["trigger"] }))}>
                  <option value="contact.added">A contact is added</option>
                  <option value="event">A custom event is received</option>
                </select>
              </div>
              {m.trigger === "event" ? (
                <div>
                  <label className="label" htmlFor="event">Event</label>
                  <select id="event" className="input" value={m.eventName} onChange={(e) => update((d) => ({ ...d, eventName: e.target.value }))}>
                    <option value="">Choose…</option>
                    {events.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {events.length === 0 && <Link href="/automations/events" className="mt-1 inline-block text-xs text-accent hover:underline">Create an event</Link>}
                </div>
              ) : null}
              <div className={m.trigger === "event" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor="segment">Only for contacts in</label>
                <select id="segment" className="input" value={m.audienceId} onChange={(e) => update((d) => ({ ...d, audienceId: e.target.value }))}>
                  <option value="">Any segment</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </Node>

          {m.steps.map((s, i) => (
            <div key={i}>
              <Connector />
              <Node
                accent={s.type === "wait" ? "var(--warning)" : "var(--lime)"}
                label={s.type === "wait" ? `Wait ${s.waitDuration} ${s.waitUnit}` : `Send email${s.subject ? ` — ${s.subject}` : ""}`}
                onToggle={s.type === "email" ? () => setOpen(open === i ? null : i) : undefined}
                actions={
                  <>
                    <button className="btn btn-ghost btn-sm w-7 px-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button className="btn btn-ghost btn-sm w-7 px-0" onClick={() => move(i, 1)} disabled={i === m.steps.length - 1} aria-label="Move down">↓</button>
                    <button className="btn btn-ghost btn-sm w-7 px-0" onClick={() => update((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))} aria-label="Remove step">✕</button>
                  </>
                }
              >
                {s.type === "wait" ? (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={720} className="input w-24" value={s.waitDuration} onChange={(e) => setStep(i, { waitDuration: Math.max(1, Math.min(720, Number(e.target.value) || 1)) })} aria-label="Wait duration" />
                    <select className="input w-36" value={s.waitUnit} onChange={(e) => setStep(i, { waitUnit: e.target.value as WaitStep["waitUnit"] })} aria-label="Wait unit">
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                ) : open === i ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label">From</label>
                      <input className="input" value={s.from} placeholder={defaultFrom || "Acme <hello@your-domain.com>"} onChange={(e) => setStep(i, { from: e.target.value })} />
                      {!s.from && defaultFrom && <button className="mt-1 text-xs text-accent hover:underline" onClick={() => setStep(i, { from: defaultFrom })}>Use {defaultFrom}</button>}
                    </div>
                    <div>
                      <label className="label">Subject</label>
                      <input className="input" value={s.subject} onChange={(e) => setStep(i, { subject: e.target.value })} maxLength={998} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="label">HTML</label>
                        {templates.length > 0 && (
                          <select
                            className="input input-pill h-7 w-auto text-xs mb-1.5"
                            value=""
                            onChange={(e) => {
                              const t = templates.find((x) => x.id === e.target.value);
                              if (t) setStep(i, { html: t.html, subject: s.subject || t.subject });
                            }}
                            aria-label="Insert template"
                          >
                            <option value="">Insert template…</option>
                            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                      </div>
                      <textarea className="input mono text-xs" rows={8} value={s.html} onChange={(e) => setStep(i, { html: e.target.value })} />
                      <p className="mt-1 text-[11px] text-fg-subtle">Merge tags: {"{{first_name}}"}, {"{{contact.key}}"}, {"{{event.key}}"}, {"{{unsubscribe_url}}"}</p>
                    </div>
                  </div>
                ) : (
                  <button className="text-xs text-accent hover:underline" onClick={() => setOpen(i)}>Edit email</button>
                )}
              </Node>
            </div>
          ))}

          <Connector />
          <div className="flex justify-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => update((d) => ({ ...d, steps: [...d.steps, { type: "wait", waitDuration: 1, waitUnit: "days" }] }))} disabled={m.steps.length >= 20}>+ Wait</button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                update((d) => ({ ...d, steps: [...d.steps, { type: "email", from: defaultFrom, subject: "", html: "" }] }));
                setOpen(m.steps.length);
              }}
              disabled={m.steps.length >= 20}
            >
              + Send email
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-fg-subtle">Waits add up — an email after “wait 1 day” and “wait 2 days” sends 3 days after the trigger (max 30 days).</p>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="card-title mb-3">Performance</p>
            <div className="flex justify-between text-sm"><span className="text-fg-muted">Entered</span><span>{stats.entered.toLocaleString()}</span></div>
            <div className="mt-1 flex justify-between text-sm"><span className="text-fg-muted">Completed</span><span>{stats.completed.toLocaleString()}</span></div>
          </div>
          <div className="card p-5 text-sm">
            <p className="card-title mb-2">How it runs</p>
            <p className="text-fg-muted">Only <b>active</b> automations run. Contacts who unsubscribe never enter. Each email step goes through your quota, domain checks and suppression list.</p>
          </div>
          <button
            className="btn btn-danger w-full"
            disabled={pending}
            onClick={() => {
              if (confirm("Delete this automation? Scheduled emails already queued will still send.")) start(() => deleteAutomationAction(id));
            }}
          >
            Delete automation
          </button>
        </aside>
      </div>
    </div>
  );
}

function Node({ accent, label, children, actions, onToggle }: { accent: string; label: string; children: React.ReactNode; actions?: React.ReactNode; onToggle?: () => void }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-2.5 text-left" disabled={!onToggle}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
          <span className="truncate text-sm font-medium">{label}</span>
        </button>
        <div className="flex shrink-0 items-center">{actions}</div>
      </div>
      {children}
    </div>
  );
}

function Connector() {
  return <div className="mx-auto h-6 w-px" style={{ background: "var(--border-strong)" }} />;
}
