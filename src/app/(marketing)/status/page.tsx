import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { overall, systemStatus } from "@/lib/status";

export const revalidate = 60;

export const metadata: Metadata = pageMeta({
  title: "System status",
  description: "Live status of the Stack Emails API, dashboard, sending queue and email delivery.",
  path: "/status",
});

const LABEL = { operational: "Operational", degraded: "Degraded performance", down: "Outage" } as const;
const COLOR = { operational: "#10b981", degraded: "#f59e0b", down: "#ef4444" } as const;

export default async function StatusPage() {
  const components = await systemStatus();
  const state = overall(components);
  const checkedAt = new Date();

  return (
    <section className="m-container max-w-[860px] pt-32 pb-24">
      <p className="m-eyebrow">Status</p>
      <h1 className="m-display mt-5 text-[40px] leading-[1.05] sm:text-[56px]">
        {state === "operational" ? "All systems operational" : state === "degraded" ? "Some systems are degraded" : "We're experiencing an outage"}
      </h1>
      <p className="mt-4 text-[14px]" style={{ color: "var(--m-faint)" }}>
        Checked <time dateTime={checkedAt.toISOString()}>{checkedAt.toUTCString()}</time> · refreshes every minute
      </p>

      <div className="mt-10 overflow-hidden rounded-[22px] border" style={{ borderColor: "var(--m-line)", background: "var(--m-surface)" }}>
        {components.map((c, i) => (
          <div key={c.name} className={`flex items-center justify-between gap-4 px-6 py-5 ${i ? "border-t" : ""}`} style={{ borderColor: "var(--m-line)" }}>
            <div>
              <p className="font-medium" style={{ color: "var(--m-head)" }}>{c.name}</p>
              {c.detail && <p className="text-[14px]" style={{ color: "var(--m-muted)" }}>{c.detail}</p>}
            </div>
            <span className="flex items-center gap-2 text-[14px]" style={{ color: COLOR[c.status] }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[c.status] }} />
              {LABEL[c.status]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[14px]" style={{ color: "var(--m-muted)" }}>
        Email delivery runs on Amazon SES — see the <a className="m-link" href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener noreferrer">AWS Health Dashboard</a> for regional infrastructure status.
      </p>
    </section>
  );
}
