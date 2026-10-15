import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Audience, Contact } from "@/lib/db/models";
import { AudienceTabs } from "@/components/dashboard/AudienceTabs";
import { AudiencesManager, type AudienceView } from "@/components/dashboard/AudiencesManager";
import { ContactsPanel, type FlatContact } from "@/components/dashboard/ContactsPanel";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

const PROPERTIES = [
  { name: "email", type: "Email", system: true },
  { name: "first_name", type: "Text", system: true },
  { name: "last_name", type: "Text", system: true },
  { name: "subscribed", type: "Boolean", system: true },
];

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab ?? "contacts";
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const wid = workspace._id;

  const [audiences, contacts, total, unsub] = await Promise.all([
    Audience.find({ workspaceId: wid }).sort({ createdAt: -1 }).lean(),
    Contact.find({ workspaceId: wid }).sort({ createdAt: -1 }).limit(500).lean(),
    Contact.countDocuments({ workspaceId: wid }),
    Contact.countDocuments({ workspaceId: wid, unsubscribed: true }),
  ]);

  const audienceName = new Map(audiences.map((a) => [String(a._id), a.name]));
  const audienceViews: AudienceView[] = await Promise.all(
    audiences.map(async (a) => ({
      id: String(a._id),
      name: a.name,
      contactCount: await Contact.countDocuments({ audienceId: a._id }),
      createdAt: new Date(a.createdAt).toISOString(),
    })),
  );

  const flatContacts: FlatContact[] = contacts.map((c) => ({
    id: String(c._id),
    email: c.email,
    name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    audience: audienceName.get(String(c.audienceId)) ?? "—",
    unsubscribed: c.unsubscribed,
  }));
  const pickerAudiences = audiences.map((a) => ({ id: String(a._id), name: a.name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <AudienceTabs />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8 max-w-xl">
        <Stat label="All contacts" value={total} />
        <Stat label="Subscribers" value={total - unsub} />
        <Stat label="Unsubscribers" value={unsub} />
      </div>

      {active === "contacts" && <ContactsPanel contacts={flatContacts} audiences={pickerAudiences} />}

      {active === "segments" && <AudiencesManager audiences={audienceViews} />}

      {active === "properties" && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Properties</h2>
            <button className="btn btn-secondary">Add property</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Source</th>
              </tr>
            </thead>
            <tbody>
              {PROPERTIES.map((p) => (
                <tr key={p.name} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 mono">{p.name}</td>
                  <td className="px-5 py-3 text-fg-muted">{p.type}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle">{p.system ? "System" : "Custom"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === "topics" && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Subscription topics</h2>
            <button className="btn btn-secondary">Add topic</button>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="font-medium text-sm">Marketing</p>
              <p className="text-xs text-fg-subtle">Default topic — product news and updates.</p>
            </div>
            <span className="badge" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }}>
              Enabled
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
