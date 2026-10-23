import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { SupportTicket } from "@/lib/db/models";
import { systemStatus, overall } from "@/lib/status";
import { FAQS } from "@/lib/knowledge";
import { HelpCenter } from "@/components/dashboard/HelpCenter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Help" };

export default async function HelpPage() {
  const { user } = await requireDashboardContext();
  await connectToDatabase();
  const [tickets, components] = await Promise.all([
    SupportTicket.find({ userId: user._id }).sort({ lastActivityAt: -1 }).limit(20).lean(),
    systemStatus(),
  ]);
  const state = overall(components);
  const color = state === "operational" ? "var(--success)" : state === "degraded" ? "var(--warning)" : "var(--danger)";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Help</h1>
        <Link href="/status" className="flex items-center gap-2 text-sm" style={{ color }}>
          {state === "operational" ? "All systems operational" : state === "degraded" ? "Degraded performance" : "Partial outage"}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          </span>
        </Link>
      </div>
      <HelpCenter
        tickets={tickets.map((t) => ({
          id: String(t._id),
          number: t.number,
          subject: t.subject,
          status: t.status,
          category: t.category,
          lastActivityAt: t.lastActivityAt.toISOString(),
          messages: t.messages.map((m) => ({ author: m.author, name: m.name ?? "", body: m.body, at: new Date(m.at).toISOString() })),
        }))}
        faqs={FAQS.map((f) => ({ q: f.q, a: f.a, category: f.category }))}
      />
    </div>
  );
}
