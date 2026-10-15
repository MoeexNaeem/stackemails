"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { createAutomationAction, deleteAutomationAction } from "@/app/(app)/actions";

export type AutomationView = {
  id: string;
  name: string;
  status: string;
  trigger: string;
  steps: number;
  updatedAt: string;
};

const TRIGGER_LABEL: Record<string, string> = {
  "contact.added": "Contact added",
  "contact.updated": "Contact updated",
};

export function AutomationsList({ automations }: { automations: AutomationView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this automation?")) return;
    start(async () => {
      await deleteAutomationAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Trigger email sequences automatically when contacts join or change.
          </p>
        </div>
        <form action={createAutomationAction}>
          <button type="submit" className="btn btn-primary">
            + Create automation
          </button>
        </form>
      </div>

      {automations.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="font-medium">No automations yet</p>
          <p className="text-sm text-fg-subtle mt-1">
            Automate onboarding, drip campaigns, and follow-ups.
          </p>
          <form action={createAutomationAction} className="mt-4">
            <button type="submit" className="btn btn-primary">
              + Create automation
            </button>
          </form>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Trigger</th>
                <th className="px-5 py-3 font-medium">Steps</th>
                <th className="px-5 py-3 font-medium text-right">Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3">
                    <Link href={`/automations/${a.id}`} className="font-medium hover:text-accent">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status === "active" ? "delivered" : a.status === "paused" ? "pending" : "test"} />
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{TRIGGER_LABEL[a.trigger] ?? a.trigger}</td>
                  <td className="px-5 py-3 text-fg-muted">{a.steps}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                    {new Date(a.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => remove(a.id)} disabled={pending}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
