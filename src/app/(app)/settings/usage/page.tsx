import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, Contact, Domain, Inbox, Membership, Segment, Webhook } from "@/lib/db/models";
import { sentThisPeriod, sentToday } from "@/lib/quota";
import { fmtLimit, limitsFor } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usage" };

function Ring({ value, max }: { value: number; max: number }) {
  const pct = Number.isFinite(max) && max > 0 ? Math.min(1, value / max) : 0;
  const r = 7;
  const c = 2 * Math.PI * r;
  const color = pct >= 1 ? "var(--danger)" : pct >= 0.8 ? "var(--warning)" : "var(--lime)";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0" aria-hidden>
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
      <circle cx="9" cy="9" r={r} fill="none" stroke={color} strokeWidth="2" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform="rotate(-90 9 9)" />
    </svg>
  );
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-2.5">
        <Ring value={value} max={max} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-fg-muted">{value.toLocaleString()} / {fmtLimit(max)}</span>
    </div>
  );
}

function Block({ title, desc, plan, children }: { title: string; desc: string; plan: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-8 border-t border-border py-8 first:border-0 first:pt-0 md:grid-cols-2">
      <div>
        <h2 className="text-lg font-normal">{title}</h2>
        <p className="mt-1 max-w-xs text-sm text-fg-muted">{desc}</p>
        <Link href="/settings/billing" className="btn btn-secondary btn-sm mt-4">Upgrade</Link>
      </div>
      <div>
        <p className="mb-1 text-sm capitalize text-fg-subtle">{plan}</p>
        {children}
      </div>
    </section>
  );
}

export default async function UsagePage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const wid = workspace._id;
  const limits = limitsFor(workspace.plan);
  const [contacts, domains, segments, automations, inboxes, members, webhooks] = await Promise.all([
    Contact.countDocuments({ workspaceId: wid }),
    Domain.countDocuments({ workspaceId: wid }),
    Segment.countDocuments({ workspaceId: wid }),
    Automation.countDocuments({ workspaceId: wid, status: "active" }),
    Inbox.countDocuments({ workspaceId: wid }),
    Membership.countDocuments({ workspaceId: wid }),
    Webhook.countDocuments({ workspaceId: wid }),
  ]);
  const plan = workspace.plan ?? "free";

  return (
    <div>
      <Block title="Transactional" desc="Integrate email into your app using the Stack Emails API or SMTP interface." plan={plan}>
        <Row label="Monthly limit" value={sentThisPeriod(workspace)} max={workspace.monthlyQuota} />
        <Row label="Daily limit" value={sentToday(workspace)} max={workspace.dailyQuota} />
      </Block>
      <Block title="Marketing" desc="Design and send marketing emails using Broadcasts and your Audience." plan={plan}>
        <Row label="Contacts" value={contacts} max={workspace.contactsQuota} />
        <Row label="Segments" value={segments} max={limits.segments} />
        <div className="flex items-center justify-between py-3 text-sm"><span className="pl-7">Broadcasts</span><span className="text-fg-muted">Unlimited</span></div>
      </Block>
      <Block title="Team" desc="Quotas and limits for your team." plan={plan}>
        <Row label="Domains" value={domains} max={limits.domains} />
        <Row label="Team members" value={members} max={limits.members} />
        <Row label="Inboxes" value={inboxes} max={limits.inboxes} />
        <Row label="Webhook endpoints" value={webhooks} max={limits.webhooks} />
        <div className="flex items-center justify-between border-b border-border py-3 text-sm"><span className="pl-7">Active automations</span><span className="text-fg-muted">{automations.toLocaleString()}</span></div>
        <div className="flex items-center justify-between py-3 text-sm"><span className="pl-7">API rate limit</span><span className="text-fg-muted">10 req/s · 100 req/s for sending</span></div>
      </Block>
      <section className="grid gap-8 border-t border-border pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-normal">Need more?</h2>
          <p className="mt-1 max-w-xs text-sm text-fg-muted">Dedicated IPs, higher volume, SSO and custom limits are available on request.</p>
        </div>
        <div className="space-y-4 text-sm">
          <p><span className="font-medium">Higher volume</span><br /><span className="text-fg-muted">Plans scale to millions of emails a month with volume pricing.</span></p>
          <p><span className="font-medium">Dedicated IPs</span><br /><span className="text-fg-muted">Isolate your sending reputation once you send 100k+ emails a month.</span></p>
          <Link href="/contact?topic=sales" className="btn btn-secondary btn-sm">Talk to sales</Link>
        </div>
      </section>
    </div>
  );
}
