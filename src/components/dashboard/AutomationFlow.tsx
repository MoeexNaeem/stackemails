"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAutomationAction } from "@/app/(app)/actions";

type Step = {
  type: string;
  waitDuration?: number;
  waitUnit?: string;
  subject?: string;
};

export function AutomationFlow({
  id,
  name,
  status,
  trigger,
  steps,
}: {
  id: string;
  name: string;
  status: string;
  trigger: string;
  steps: Step[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = status === "active";

  function toggle() {
    start(async () => {
      await toggleAutomationAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/automations" className="text-sm text-fg-muted hover:text-fg">
            ← Automations
          </Link>
          <span className="text-fg-subtle">/</span>
          <span className="font-medium">{name}</span>
        </div>
        <button
          className={active ? "btn btn-secondary" : "btn btn-primary"}
          onClick={toggle}
          disabled={pending}
        >
          {pending ? "…" : active ? "Pause" : "Activate"}
        </button>
      </div>

      <div className="max-w-md mx-auto">
        <FlowCard
          title="Trigger"
          subtitle={trigger === "contact.added" ? "When a contact is added" : "When a contact is updated"}
          accent="var(--accent)"
        />
        {steps.map((s, i) => (
          <div key={i}>
            <Connector />
            {s.type === "wait" ? (
              <FlowCard title="Wait" subtitle={`${s.waitDuration ?? 1} ${s.waitUnit ?? "days"}`} accent="var(--warning)" />
            ) : (
              <FlowCard title="Send email" subtitle={s.subject || "Untitled email"} accent="var(--success)" />
            )}
          </div>
        ))}
        <Connector />
        <div className="text-center text-sm text-fg-subtle py-2">End</div>
      </div>

      <p className="text-center text-xs text-fg-subtle mt-6">
        Step editing (add/reorder wait & email steps) arrives in the next update.
      </p>
    </div>
  );
}

function FlowCard({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-fg-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Connector() {
  return <div className="w-px h-6 mx-auto" style={{ background: "var(--border-strong)" }} />;
}
