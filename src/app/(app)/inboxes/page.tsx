import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, InboundEmail, Inbox } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { CreateInboxButton } from "@/components/inboxes/CreateInboxButton";
import { escapeRegex } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inboxes" };

export default async function InboxesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (q) {
    const rx = { $regex: escapeRegex(q.trim()), $options: "i" };
    filter.$or = [{ name: rx }, { address: rx }];
  }
  const [inboxes, domains, last] = await Promise.all([
    Inbox.find(filter).sort({ createdAt: -1 }).lean(),
    Domain.find({ workspaceId: workspace._id, status: "verified" }).select("name receivingEnabled").lean(),
    InboundEmail.aggregate([
      { $match: { workspaceId: workspace._id, inboxId: { $exists: true } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$inboxId", at: { $first: "$createdAt" }, count: { $sum: 1 } } },
    ]),
  ]);
  const lastBy = new Map(last.map((l) => [String(l._id), l as { at: Date; count: number }]));
  const domainOptions = domains.map((d) => ({ id: String(d._id), name: d.name, receiving: !!d.receivingEnabled }));
  const disabled = workspace.labs?.inboxes === false;

  return (
    <div>
      <PageHeader title="Inboxes" description="Dedicated addresses your team can use to send, receive, organise and reply to email." action={!disabled && <CreateInboxButton domains={domainOptions} />} />
      {disabled ? (
        <div className="card"><EmptyState title="Inboxes are turned off" description="Turn them on in Settings > Labs."><Link href="/settings/labs" className="btn btn-primary">Open Labs</Link></EmptyState></div>
      ) : (
        <>
          <FilterBar fields={[{ type: "search", name: "q", placeholder: "Search…" }]} />
          <div className="card overflow-hidden">
            {inboxes.length === 0 ? (
              <EmptyState icon="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" title={q ? "No inboxes match" : "No inboxes yet"} description="Create an inbox to send, receive, organize, and manage all your emails.">
                {!q && <CreateInboxButton domains={domainOptions} />}
              </EmptyState>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Inbox</th>
                    <th>Receiving</th>
                    <th>Messages</th>
                    <th>Unread</th>
                    <th className="text-right">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxes.map((i) => {
                    const l = lastBy.get(String(i._id));
                    return (
                      <tr key={String(i._id)}>
                        <td>
                          <Link href={`/inboxes/${i._id}`} className="font-medium hover:text-accent">{i.name}</Link>
                          <p className="text-xs text-fg-subtle mono">{i.address}</p>
                        </td>
                        <td className="text-xs text-fg-muted">{i.receiveMode === "domain" ? "Domain MX" : <span className="mono">{i.alias}</span>}</td>
                        <td>{l?.count ?? 0}</td>
                        <td>{i.unread ? <span className="badge delta-up">{i.unread}</span> : <span className="text-fg-subtle">0</span>}</td>
                        <td className="text-right text-fg-subtle">{l ? timeAgo(l.at) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
