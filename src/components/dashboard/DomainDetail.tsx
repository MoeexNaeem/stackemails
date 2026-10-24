"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { deleteDomainAction, updateDomainSettingsAction, verifyDomainAction } from "@/app/(app)/domain-actions";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { confirmDialog } from "@/components/ui/Confirm";

type Rec = { type: string; name: string; value: string; priority: number | null; purpose: string; status: string };

export type DomainDetailData = {
  id: string;
  name: string;
  status: string;
  region: string;
  tlsMode: string;
  clickTracking: boolean;
  openTracking: boolean;
  receiving: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  records: Rec[];
  events: { type: string; at: string }[];
};

const EVENT_LABEL: Record<string, string> = { added: "Domain added", dns_verified: "DNS verified", verified: "Domain verified", failed: "Verification failed" };
const SECTIONS: { purpose: string; title: string; help: string }[] = [
  { purpose: "DKIM", title: "DKIM", help: "Signs every message so inboxes can prove it came from you. Required." },
  { purpose: "SPF", title: "SPF (custom return path)", help: "Authorises Stack Emails to send for your domain and receives bounce feedback." },
  { purpose: "DMARC", title: "DMARC", help: "Tells inboxes what to do with unauthenticated mail. Start with p=none, tighten later." },
  { purpose: "MX", title: "Receiving", help: "Routes email sent to your domain to Stack Emails." },
];

/** Host to type at most DNS providers (they append the zone automatically). */
function hostOf(name: string, domain: string) {
  const root = domain.split(".").slice(-2).join(".");
  if (name === root) return "@";
  return name.endsWith(`.${root}`) ? name.slice(0, -(root.length + 1)) : name;
}

export function DomainDetail({ domain }: { domain: DomainDetailData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"records" | "configuration">("records");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const verified = domain.status === "verified";

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    start(async () => {
      const r = await fn();
      setNote({ ok: r.ok, text: r.error ?? r.message ?? "" });
      router.refresh();
    });
  }

  return (
    <div>
      <Link href="/domains" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Domains</Link>
      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-strong" style={{ background: "var(--bg-card)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" /></svg>
          </span>
          <div>
            <p className="eyebrow">Domain</p>
            <h1 className="mono text-xl">{domain.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {note && <span className="max-w-xs text-xs" style={{ color: note.ok ? "var(--success)" : "var(--warning)" }}>{note.text}</span>}
          <button className="btn btn-primary" onClick={() => run(() => verifyDomainAction(domain.id))} disabled={pending}>{pending ? "Checking…" : verified ? "Re-check DNS" : "Verify DNS records"}</button>
          <button
            className="btn btn-danger"
            disabled={pending}
            onClick={async () => {
              if (!(await confirmDialog(`Remove ${domain.name}? You won't be able to send from it until it's added and verified again.`))) return;
              start(async () => {
                await deleteDomainAction(domain.id);
                router.push("/domains");
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="card mb-6 grid grid-cols-2 gap-6 p-5 sm:grid-cols-4">
        <Meta label="Status"><StatusBadge status={domain.status} /></Meta>
        <Meta label="Region"><span className="mono text-sm">{domain.region}</span></Meta>
        <Meta label="Created"><span className="text-sm">{new Date(domain.createdAt).toLocaleDateString()}</span></Meta>
        <Meta label="Last checked"><span className="text-sm">{timeAgo(domain.lastCheckedAt)}</span></Meta>
      </div>

      <div className="card mb-6 p-5">
        <p className="text-sm" style={{ color: verified ? "var(--success)" : "var(--fg-muted)" }}>
          {verified ? <><Icon name="check" size={15} className="mr-1.5" />Domain verified. You can send from any address at this domain.</> : "Add the DNS records below at your DNS provider, then click Verify. Propagation can take up to 48 hours."}
        </p>
        {domain.events.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {domain.events.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div>
                  <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{EVENT_LABEL[e.type] ?? e.type}</span>
                  <p className="mt-1 text-[11px] text-fg-subtle">{new Date(e.at).toLocaleString()}</p>
                </div>
                {i < domain.events.length - 1 && <Icon name="chevron-right" size={14} className="text-fg-subtle" />}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tabs mb-4">
        <button className="tab" data-active={tab === "records"} onClick={() => setTab("records")}>DNS records</button>
        <button className="tab" data-active={tab === "configuration"} onClick={() => setTab("configuration")}>Configuration</button>
      </div>

      {tab === "records" ? (
        <div className="space-y-4">
          {SECTIONS.map((sec) => {
            const recs = domain.records.filter((r) => r.purpose === sec.purpose);
            if (!recs.length) return null;
            return (
              <div key={sec.purpose} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <div>
                    <p className="font-medium">{sec.title}</p>
                    <p className="text-xs text-fg-subtle">{sec.help}</p>
                  </div>
                  <StatusBadge status={recs.every((r) => r.status === "verified") ? "verified" : "pending"} />
                </div>
                <div className="overflow-x-auto">
                  <table className="table mt-2 text-xs">
                    <thead>
                      <tr><th>Type</th><th>Name / Host</th><th>Value</th>{recs.some((r) => r.priority) && <th>Priority</th>}<th>TTL</th><th>Status</th></tr>
                    </thead>
                    <tbody className="mono">
                      {recs.map((r, i) => (
                        <tr key={i} className="align-top">
                          <td><span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{r.type}</span></td>
                          <td className="max-w-[240px]"><span className="break-all">{hostOf(r.name, domain.name)}</span> <CopyButton value={hostOf(r.name, domain.name)} className="!px-1.5 !py-0.5" /><p className="mt-0.5 break-all text-[10px] text-fg-subtle">{r.name}</p></td>
                          <td className="max-w-[320px]"><span className="break-all">{r.value}</span> <CopyButton value={r.value} className="!px-1.5 !py-0.5" /></td>
                          {recs.some((x) => x.priority) && <td>{r.priority ?? ""}</td>}
                          <td>Auto</td>
                          <td><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <Toggle title="Click tracking" help="Rewrites links through a signed redirect to count clicks." on={domain.clickTracking} disabled={pending} onChange={(v) => run(() => updateDomainSettingsAction(domain.id, { clickTracking: v }))} />
          <Toggle title="Open tracking" help="Adds a 1×1 pixel to count opens. Some inboxes block images, so open rates are estimates." on={domain.openTracking} disabled={pending} onChange={(v) => run(() => updateDomainSettingsAction(domain.id, { openTracking: v }))} />
          <Toggle title="Receiving" help="Accept inbound email for this domain. Adds an MX record to publish; remove other MX records first if this domain already has a mailbox provider." on={domain.receiving} disabled={pending} onChange={(v) => run(() => updateDomainSettingsAction(domain.id, { receiving: v }))} />
          <div className="card p-5">
            <p className="font-medium">TLS</p>
            <p className="mt-1 text-sm text-fg-muted">Opportunistic TLS encrypts when the receiver supports it; Enforced TLS refuses to deliver unencrypted.</p>
            <select className="input mt-3 w-56" value={domain.tlsMode} disabled={pending} onChange={(e) => run(() => updateDomainSettingsAction(domain.id, { tlsMode: e.target.value as "opportunistic" | "enforced" }))}>
              <option value="opportunistic">Opportunistic</option>
              <option value="enforced">Enforced</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Toggle({ title, help, on, disabled, onChange }: { title: string; help: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card flex items-start justify-between gap-4 p-5">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-fg-muted">{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: on ? "var(--lime)" : "var(--bg-hover)", border: "1px solid var(--border-strong)" }}
      >
        <span className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2, width: 18, height: 18 }} />
      </button>
    </div>
  );
}
