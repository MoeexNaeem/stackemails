import Link from "next/link";
import { createAutomationAction } from "@/app/(app)/automation-actions";

export function AutomationsHeader({ tab, action }: { tab: "automations" | "events"; action?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-5">Automations</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="tabs" aria-label="Automations">
          <Link href="/automations" className="tab" data-active={tab === "automations"}>Automations</Link>
          <Link href="/automations/events" className="tab" data-active={tab === "events"}>Events</Link>
        </nav>
        {action ?? (
          <form action={createAutomationAction}>
            <button className="btn btn-primary">+ Create automation</button>
          </form>
        )}
      </div>
    </div>
  );
}
