import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, Domain, Audience, Broadcast, Automation } from "@/lib/db/models";

export const dynamic = "force-dynamic";

function Ring({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke={pct >= 1 ? "var(--danger)" : "var(--success)"}
        strokeWidth="2"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
}

function Row({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5">
        <Ring value={value} max={max} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-fg-muted">{display}</span>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-8 py-8 border-t border-border first:border-0 first:pt-0">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-fg-muted max-w-xs">{desc}</p>
        <button className="btn btn-secondary mt-4">Upgrade</button>
      </div>
      <div>
        <p className="text-sm text-fg-subtle mb-1">Free</p>
        {children}
      </div>
    </div>
  );
}

export default async function UsagePage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const wid = workspace._id;

  const [contacts, domains, segments, broadcasts, automations] = await Promise.all([
    Contact.countDocuments({ workspaceId: wid }),
    Domain.countDocuments({ workspaceId: wid }),
    Audience.countDocuments({ workspaceId: wid }),
    Broadcast.countDocuments({ workspaceId: wid }),
    Automation.countDocuments({ workspaceId: wid }),
  ]);

  const sent = workspace.usage?.sent ?? 0;
  const daily = Math.min(sent, 100);

  return (
    <div>
      <Section title="Transactional" desc="Integrate email into your app using the NanoSend API or SMTP interface.">
        <Row label="Monthly limit" value={sent} max={workspace.monthlyQuota} display={`${sent.toLocaleString()} / ${workspace.monthlyQuota.toLocaleString()}`} />
        <Row label="Daily limit" value={daily} max={100} display={`${daily} / 100`} />
      </Section>

      <Section title="Marketing" desc="Design and send marketing emails using Broadcasts and Audiences.">
        <Row label="Contacts limit" value={contacts} max={workspace.contactsQuota} display={`${contacts} / ${workspace.contactsQuota.toLocaleString()}`} />
        <Row label="Segments limit" value={segments} max={3} display={`${segments} / 3`} />
        <Row label="Broadcasts limit" value={broadcasts} max={Infinity} display="Unlimited" />
      </Section>

      <Section title="Team" desc="Understand the quotas and limits for your team.">
        <Row label="AI credits" value={0} max={5} display="0 / 5" />
        <Row label="Automations" value={automations} max={10000} display={`${automations} / 10,000`} />
        <Row label="Domains" value={domains} max={3} display={`${domains} / 3`} />
        <Row label="Rate limit" value={0} max={1} display="10 req/s" />
      </Section>

      {/* Extras */}
      <div className="pt-8 border-t border-border">
        <h2 className="text-lg font-semibold mb-4">Extras</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="font-semibold flex items-center gap-2">
              Pay-as-you-go
              <span className="badge" style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)", color: "var(--warning)" }}>
                Paid feature
              </span>
            </p>
            <p className="mt-1 text-sm text-fg-muted max-w-xs">Continue using NanoSend beyond your quota.</p>
          </div>
          <div className="space-y-6">
            <div>
              <p className="font-medium text-sm">Transactional · $0.90 / Per 1,000 Emails</p>
              <p className="text-sm text-fg-muted mt-1">
                When enabled, you continue sending beyond your quota. We automatically charge $0.90 for each additional bucket of 1,000 emails.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Automations · $0.0015 / Per Run</p>
              <p className="text-sm text-fg-muted mt-1">
                Start with 10,000 Automation Runs for free, and scale as you need.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-border">
          <div>
            <p className="font-semibold">Add-ons</p>
            <p className="mt-1 text-sm text-fg-muted max-w-xs">Get even more of NanoSend with special add-ons.</p>
          </div>
          <div className="space-y-6">
            {[
              { title: "Domains – $20 / Mo", desc: "Adds 100 domains on top of the number included in your plan." },
              { title: "Dedicated IPs – $30 / Mo", desc: "We provision, warm up, monitor and auto-scale a dedicated IP for consistent deliverability." },
              { title: "Single Sign-On – $150 / Mo", desc: "Let your team sign in with your identity provider. Available on Scale plans." },
            ].map((a) => (
              <div key={a.title}>
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-sm text-fg-muted mt-1">{a.desc}</p>
                <button className="btn btn-secondary mt-2 !py-1.5">View pricing</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
