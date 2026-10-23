"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLabsFlagAction } from "@/app/(app)/settings-actions";

const FEATURES = [
  { flag: "inboxes" as const, title: "Inboxes", desc: "Shared inboxes your team and AI agents can use to send, receive, triage and reply to email. Create inboxes in the dashboard or connect agents through the MCP server.", href: "/inboxes" },
  { flag: "assistant" as const, title: "Ask anything (AI assistant)", desc: "An in-dashboard assistant (Ctrl/⌘ K) that answers questions about sending, domains, deliverability and the API using your team's context.", href: "/overview" },
];

export function LabsToggles({ inboxes, assistant }: { inboxes: boolean; assistant: boolean }) {
  const router = useRouter();
  const [state, setState] = useState({ inboxes, assistant });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {FEATURES.map((f) => {
        const on = state[f.flag];
        return (
          <div key={f.flag} className="card overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{f.title}</h2>
                <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>Beta</span>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{f.desc}</p>
            </div>
            <div className="flex items-center gap-4 border-t border-border px-6 py-3">
              <button
                role="switch"
                aria-checked={on}
                aria-label={`Enable ${f.title}`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await setLabsFlagAction(f.flag, !on);
                    if (!r.ok) return setError(r.error ?? "Couldn't save.");
                    setState((s) => ({ ...s, [f.flag]: !on }));
                    router.refresh();
                  })
                }
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{ background: on ? "var(--lime)" : "var(--bg-hover)", border: "1px solid var(--border-strong)" }}
              >
                <span className="absolute top-0.5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2, width: 18, height: 18 }} />
              </button>
              <Link href={f.href} className="text-sm text-fg-muted hover:text-fg">Learn more ↗</Link>
            </div>
          </div>
        );
      })}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
