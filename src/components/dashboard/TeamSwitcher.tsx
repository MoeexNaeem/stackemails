"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeamAction, switchTeamAction } from "@/app/(app)/team-actions";

export type TeamOption = { id: string; name: string; plan: string };

const GRADS = [
  "linear-gradient(135deg,#b77fe0,#7c3aed)",
  "linear-gradient(135deg,#c6f04f,#65a30d)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#38bdf8,#6366f1)",
  "linear-gradient(135deg,#f472b6,#db2777)",
];
function grad(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
}

export function TeamSwitcher({ teams, activeId }: { teams: TeamOption[]; activeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const active = teams.find((t) => t.id === activeId) ?? teams[0];

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(id: string) {
    if (id === activeId) return setOpen(false);
    start(async () => {
      await switchTeamAction(id);
      setOpen(false);
      router.push("/overview");
      router.refresh();
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createTeamAction(name);
      if (!res.ok) return setError(res.error ?? "Could not create team.");
      setName("");
      setCreating(false);
      setOpen(false);
      router.push("/onboarding");
      router.refresh();
    });
  }

  if (!active) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border px-2.5 py-2 text-left hover:bg-bg-hover transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white" style={{ background: grad(active.id) }}>
          {active.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{active.name}</span>
          <span className="block text-[11px] text-fg-subtle capitalize">{active.plan} plan</span>
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9l4-4 4 4M16 15l-4 4-4-4" /></svg>
      </button>

      {open && (
        <div role="menu" className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border-strong p-1.5 shadow-2xl" style={{ background: "var(--bg-elevated)" }}>
          <p className="px-2.5 pt-1 pb-1.5 eyebrow">Teams</p>
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => pick(t.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-bg-hover"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold text-white" style={{ background: grad(t.id) }}>
                {t.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{t.name}</span>
              {t.id === activeId && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          {creating ? (
            <form onSubmit={create} className="p-1.5 space-y-2">
              <input autoFocus className="input" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-1.5">
                <button type="submit" className="btn btn-primary btn-sm flex-1" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-fg-muted hover:bg-bg-hover hover:text-fg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Create team
            </button>
          )}
        </div>
      )}
    </div>
  );
}
