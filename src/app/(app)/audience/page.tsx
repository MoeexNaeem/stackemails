import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, ContactProperty, Segment } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { ContactsTable } from "@/components/audience/ContactsTable";
import { ContactsToolbar } from "@/components/audience/ContactsToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.q) {
    const rx = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }
  if (sp.segment && isValidObjectId(sp.segment)) filter.segmentIds = sp.segment;
  if (sp.sub === "subscribed") filter.unsubscribed = { $ne: true };
  if (sp.sub === "unsubscribed") filter.unsubscribed = true;
  const page = pageOf(sp.page);

  const [total, subs, unsubs, matching, rows, segments, properties] = await Promise.all([
    Contact.countDocuments({ workspaceId: workspace._id }),
    Contact.countDocuments({ workspaceId: workspace._id, unsubscribed: { $ne: true } }),
    Contact.countDocuments({ workspaceId: workspace._id, unsubscribed: true }),
    Contact.countDocuments(filter),
    Contact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Segment.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    ContactProperty.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
  ]);

  const segOptions = segments.map((s) => ({ id: String(s._id), name: s.name }));
  const segName = new Map(segOptions.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="grid grid-cols-3 gap-8">
          <Stat label="All contacts" value={total} />
          <Stat label="Subscribers" value={subs} />
          <Stat label="Unsubscribers" value={unsubs} />
        </div>
        <ContactsToolbar segments={segOptions} properties={properties.map((p) => ({ key: p.key, label: p.label, type: p.type }))} />
      </div>

      <FilterBar
        exportHref="/api/dashboard/contacts/export"
        fields={[
          { type: "search", name: "q", placeholder: "Search by name or email…" },
          { type: "select", name: "segment", options: [{ value: "", label: "All contacts" }, ...segOptions.map((s) => ({ value: s.id, label: s.name }))] },
          { type: "select", name: "sub", options: [{ value: "", label: "All subscriptions" }, { value: "subscribed", label: "Subscribed" }, { value: "unsubscribed", label: "Unsubscribed" }] },
        ]}
      />

      <ContactsTable
        segments={segOptions}
        rows={rows.map((c) => ({
          id: String(c._id),
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(" "),
          unsubscribed: !!c.unsubscribed,
          segments: (c.segmentIds ?? []).map((s) => segName.get(String(s))).filter((s): s is string => !!s),
          createdAt: c.createdAt.toISOString(),
        }))}
        filtered={matching !== total}
      />
      <Pagination page={page} total={matching} pageSize={PAGE_SIZE} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-2xl font-normal tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}
