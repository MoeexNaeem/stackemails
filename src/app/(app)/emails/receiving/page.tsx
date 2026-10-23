import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { InboundEmail } from "@/lib/db/models";
import { EmailsHeader } from "@/components/emails/EmailsHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceivingAddress } from "@/components/emails/ReceivingAddress";
import { RANGE_OPTIONS, escapeRegex, pageOf, rangeSince, PAGE_SIZE } from "@/lib/filters";
import { receivingDomain } from "@/lib/inbound";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Received emails" };

export default async function ReceivingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const domain = await receivingDomain(workspace);

  const filter: Record<string, unknown> = { workspaceId: workspace._id, direction: "inbound", createdAt: { $gte: rangeSince(sp.range) } };
  if (sp.q) {
    const rx = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
    filter.$or = [{ from: rx }, { subject: rx }, { to: rx }];
  }
  const page = pageOf(sp.page);
  const [total, rows] = await Promise.all([
    InboundEmail.countDocuments(filter),
    InboundEmail.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).select("messageId from fromName to subject snippet createdAt attachments read").lean(),
  ]);

  return (
    <div>
      <EmailsHeader tab="receiving" />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search by sender, recipient or subject…" },
          { type: "select", name: "range", defaultValue: "15d", options: RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" title="No received emails yet" description="Start receiving emails with your predefined address, or enable receiving on a verified domain.">
            <div className="w-full">
              <ReceivingAddress domain={domain} />
              <p className="mt-4 text-xs text-fg-subtle">
                or <Link href="/domains" className="text-accent hover:underline">set up a custom domain</Link> · <Link href="/docs#receiving" className="text-accent hover:underline">Go to docs</Link>
              </p>
            </div>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <p className="text-xs text-fg-subtle">Receiving at <code className="mono text-fg-muted">&lt;anything&gt;@{domain}</code></p>
              <ReceivingAddress domain={domain} compact />
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th className="hidden md:table-cell">To</th>
                  <th className="text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.messageId}>
                    <td className="max-w-[220px] truncate">
                      <span className={e.read ? "text-fg-muted" : "font-medium"}>{e.fromName || e.from}</span>
                    </td>
                    <td className="max-w-[360px] truncate">
                      <Link href={`/emails/receiving/${e.messageId}`} className="hover:text-accent">{e.subject}</Link>
                      <span className="text-fg-subtle"> — {e.snippet}</span>
                      {e.attachments?.length ? <span className="ml-2 text-xs text-fg-subtle">📎 {e.attachments.length}</span> : null}
                    </td>
                    <td className="hidden md:table-cell max-w-[200px] truncate text-fg-subtle">{e.to.join(", ")}</td>
                    <td className="text-right text-fg-subtle whitespace-nowrap">{timeAgo(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
