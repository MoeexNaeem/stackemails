import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Contact, Domain, EmailLog } from "@/lib/db/models";
import { emailSeries, emailTotals, rate, utcWindowStart } from "@/lib/analytics";
import { StatCard, pctChange } from "@/components/ui/StatCard";
import { PillBarChart, DonutChart } from "@/components/ui/Charts";
import { StatusBadge } from "@/components/StatusBadge";
import { RangeToggle } from "@/components/ui/RangeToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

const RANGES = { "7d": { days: 7, g: "day" as const }, "1m": { days: 30, g: "day" as const }, "3m": { days: 91, g: "week" as const } };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: raw } = await searchParams;
  const range = (raw && raw in RANGES ? raw : "7d") as keyof typeof RANGES;
  const { days, g } = RANGES[range];
  const { user, workspace } = await requireDashboardContext();
  await connectToDatabase();

  const from = utcWindowStart(days);
  const prevFrom = new Date(from.getTime() - days * 86_400_000);
  const now = new Date(Date.now() + 60_000);

  const [cur, prev, series, recent, domains, keyCount, contacts, anyEmail] = await Promise.all([
    emailTotals(workspace._id, from, now),
    emailTotals(workspace._id, prevFrom, from),
    emailSeries(workspace._id, from, days, g),
    EmailLog.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(8).select("messageId to subject status createdAt source").lean(),
    Domain.find({ workspaceId: workspace._id }).select("name status").lean(),
    ApiKey.countDocuments({ workspaceId: workspace._id, revokedAt: { $exists: false } }),
    Contact.countDocuments({ workspaceId: workspace._id }),
    EmailLog.exists({ workspaceId: workspace._id }),
  ]);

  const deliveredRate = rate(cur.delivered, cur.sent);
  const prevDeliveredRate = rate(prev.delivered, prev.sent);
  const bounceRate = rate(cur.bounced, cur.sent);
  const prevBounceRate = rate(prev.bounced, prev.sent);
  const openRate = rate(cur.opened, cur.sent);
  const prevOpenRate = rate(prev.opened, prev.sent);
  const complaintRate = rate(cur.complained, cur.sent);
  const verified = domains.some((d) => d.status === "verified");
  const steps = [
    { done: verified, label: "Verify a sending domain", href: "/domains", cta: "Add domain" },
    { done: keyCount > 0, label: "Create an API key", href: "/api-keys", cta: "Create key" },
    { done: !!anyEmail, label: "Send your first email", href: "/onboarding", cta: "Send email" },
    { done: contacts > 0, label: "Add contacts to your audience", href: "/audience", cta: "Add contacts" },
  ];
  const showSetup = steps.some((s) => !s.done);
  const pending = Math.max(0, cur.sent - cur.delivered - cur.bounced - cur.complained);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-fg-subtle">Welcome back, {user.name.split(" ")[0]}</p>
          <h1 className="text-[30px] font-normal tracking-[-0.02em]">Overview</h1>
        </div>
        <RangeToggle value={range} options={[{ value: "7d", label: "7d" }, { value: "1m", label: "1m" }, { value: "3m", label: "3m" }]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emails sent" value={cur.total.toLocaleString()} delta={pctChange(cur.total, prev.total)} trend={series.map((s) => s.total)} />
        <StatCard label="Delivery rate" value={`${deliveredRate.toFixed(1)}%`} delta={prev.sent ? deliveredRate - prevDeliveredRate : undefined} hint={`${cur.delivered.toLocaleString()} delivered`} />
        <StatCard label="Open rate" value={`${openRate.toFixed(1)}%`} delta={prev.sent ? openRate - prevOpenRate : undefined} hint={`${cur.opened.toLocaleString()} opened · ${cur.clicked.toLocaleString()} clicked`} />
        <StatCard label="Bounce rate" value={`${bounceRate.toFixed(2)}%`} delta={prev.sent ? bounceRate - prevBounceRate : undefined} invert hint={bounceRate > 4 ? "Above the 4% risk threshold" : "Healthy (under 4%)"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="card-title text-[19px]">Sending volume</h2>
              {(() => {
                const d = pctChange(cur.total, prev.total);
                return d === null ? <span className="delta delta-up">new</span> : <span className={`delta ${d >= 0 ? "delta-up" : "delta-down"}`}>{d >= 0 ? "+" : ""}{d.toFixed(1)}%</span>;
              })()}
            </div>
            <span className="text-xs text-fg-subtle">{range === "3m" ? "Weekly" : "Daily"} · last {days} days</span>
          </div>
          <PillBarChart data={series.map((s) => ({ label: s.label, value: s.total, sub: s.sub }))} height={240} />
        </div>

        <div className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="card-title text-[19px]">Outcomes</h2>
            <Link href="/metrics" className="text-fg-subtle hover:text-fg" aria-label="Open metrics"><Icon name="arrow-right" size={16} /></Link>
          </div>
          <DonutChart
            centerLabel="emails"
            slices={[
              { label: "Delivered", value: cur.delivered, color: "var(--lime)" },
              { label: "In flight", value: pending + (cur.total - cur.sent - cur.failed), color: "var(--violet)" },
              { label: "Bounced", value: cur.bounced, color: "var(--danger)" },
              { label: "Complained", value: cur.complained, color: "var(--warning)" },
              { label: "Failed", value: cur.failed, color: "#52525b" },
            ].filter((s) => s.value > 0 || s.label === "Delivered")}
          />
        </div>
      </div>

      <div className={`grid gap-6 ${showSetup ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <h2 className="card-title text-[19px]">Recent activity</h2>
            <Link href="/emails" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No emails yet" description="Your sends will show up here in real time.">
              <Link href="/onboarding" className="btn btn-primary">Send your first email</Link>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th className="hidden sm:table-cell">Recipient</th>
                    <th className="hidden md:table-cell">Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.messageId}>
                      <td className="whitespace-nowrap text-fg-subtle">{timeAgo(e.createdAt)}</td>
                      <td className="max-w-[260px] truncate"><Link href={`/emails/${e.messageId}`} className="hover:text-accent">{e.subject}</Link></td>
                      <td className="hidden sm:table-cell max-w-[200px] truncate text-fg-muted">{e.to[0]}{e.to.length > 1 ? ` +${e.to.length - 1}` : ""}</td>
                      <td className="hidden md:table-cell capitalize text-fg-muted">{e.source}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showSetup ? (
          <div className="card p-6">
            <h2 className="card-title text-[19px]">Get set up</h2>
            <p className="mt-1 text-xs text-fg-subtle">{steps.filter((s) => s.done).length} of {steps.length} done</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-hover">
              <div className="h-full rounded-full" style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%`, background: "var(--lime)" }} />
            </div>
            <ul className="mt-5 space-y-3">
              {steps.map((s) => (
                <li key={s.label} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: s.done ? "var(--lime)" : "var(--bg-hover)", color: s.done ? "#15171a" : "var(--fg-subtle)" }}>{s.done ? <Icon name="check" size={12} strokeWidth={2.6} /> : null}</span>
                  <span className={`leading-snug ${s.done ? "text-fg-subtle line-through" : ""}`}>{s.label}</span>
                  {s.done ? (
                    <span className="w-[104px]" />
                  ) : (
                    <Link href={s.href} className="inline-flex w-[104px] items-center justify-end gap-1 whitespace-nowrap text-xs text-accent hover:underline">
                      {s.cta} <Icon name="arrow-right" size={12} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Health label="Bounce rate" value={bounceRate} warn={2} risk={4} digits={2} />
        <Health label="Complaint rate" value={complaintRate} warn={0.05} risk={0.08} digits={3} />
        <div className="card p-5">
          <p className="text-[13px] text-fg-muted">Domains</p>
          <p className="mt-2 text-[26px] font-normal leading-none">{domains.filter((d) => d.status === "verified").length}<span className="text-base text-fg-subtle"> / {domains.length} verified</span></p>
          <Link href="/domains" className="mt-3 inline-block text-xs text-accent hover:underline">Manage domains</Link>
        </div>
      </div>
    </div>
  );
}

function Health({ label, value, warn, risk, digits }: { label: string; value: number; warn: number; risk: number; digits: number }) {
  const state = value >= risk ? "At risk" : value >= warn ? "Watch" : "Healthy";
  const color = value >= risk ? "var(--danger)" : value >= warn ? "var(--warning)" : "var(--lime)";
  const pctOfRisk = Math.min(100, (value / risk) * 100);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-fg-muted">{label}</p>
        <span className="badge" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>{state}</span>
      </div>
      <p className="mt-2 text-[26px] font-normal leading-none">{value.toFixed(digits)}%</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-hover">
        <div className="h-full rounded-full" style={{ width: `${pctOfRisk}%`, background: color }} />
      </div>
      <p className="mt-2 text-[11px] text-fg-subtle">Risk threshold {risk}%</p>
    </div>
  );
}
