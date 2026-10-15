"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { verifyDomainAction, deleteDomainAction, setDomainTlsAction } from "@/app/(app)/actions";

type Rec = { type: string; name: string; value: string; purpose: string; status: string };
type Event = { type: string; at: string };

export type DomainDetailData = {
  id: string;
  name: string;
  status: string;
  region: string;
  tlsMode: string;
  clickTracking: boolean;
  openTracking: boolean;
  createdAt: string;
  records: Rec[];
  events: Event[];
};

const EVENT_LABEL: Record<string, string> = {
  added: "Domain added",
  dns_verified: "DNS verified",
  verified: "Domain verified",
  failed: "Verification failed",
};

export function DomainDetail({ domain }: { domain: DomainDetailData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"records" | "configuration">("records");
  const [pending, start] = useTransition();

  function verify() {
    start(async () => {
      await verifyDomainAction(domain.id);
      router.refresh();
    });
  }
  function remove() {
    if (!confirm(`Remove ${domain.name}?`)) return;
    start(async () => {
      await deleteDomainAction(domain.id);
      router.push("/domains");
    });
  }
  function setTls(mode: "opportunistic" | "enforced") {
    start(async () => {
      await setDomainTlsAction(domain.id, mode);
      router.refresh();
    });
  }

  const verified = domain.status === "verified";

  return (
    <div>
      <Link href="/domains" className="text-sm text-fg-muted hover:text-fg">← Domains</Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "var(--bg-hover)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="1.6">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" />
            </svg>
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-subtle">Domain</p>
            <h1 className="text-xl font-semibold mono">{domain.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={verify} disabled={pending}>{pending ? "…" : "Verify"}</button>
          <button className="btn btn-danger" onClick={remove} disabled={pending}>Delete</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-subtle">Created</p>
          <p className="mt-1 text-sm">{new Date(domain.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-subtle">Status</p>
          <p className="mt-1"><StatusBadge status={domain.status} /></p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-subtle">Provider</p>
          <p className="mt-1 text-sm text-fg-muted">—</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-subtle">Region</p>
          <p className="mt-1 text-sm mono">{domain.region}</p>
        </div>
      </div>

      {/* Events */}
      <div className="card p-5 mb-6">
        {verified ? (
          <p className="text-sm mb-4" style={{ color: "var(--success)" }}>
            ✓ Domain verified: your domain is ready to send emails.
          </p>
        ) : (
          <p className="text-sm mb-4 text-fg-muted">Add the DNS records below, then click Verify.</p>
        )}
        <div className="flex items-center gap-2">
          {domain.events.length === 0 ? (
            <span className="text-sm text-fg-subtle">No events yet.</span>
          ) : (
            domain.events.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
                    {EVENT_LABEL[e.type] ?? e.type}
                  </span>
                  <p className="text-[11px] text-fg-subtle mt-1">{new Date(e.at).toLocaleString()}</p>
                </div>
                {i < domain.events.length - 1 && <span className="text-fg-subtle">→</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button className="tab" data-active={tab === "records"} onClick={() => setTab("records")}>Records</button>
        <button className="tab" data-active={tab === "configuration"} onClick={() => setTab("configuration")}>Configuration</button>
      </div>

      {tab === "records" ? (
        <div className="card p-5">
          <p className="text-sm text-fg-muted mb-4">Add the following DNS records at your domain provider.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-fg-subtle border-b border-border">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Value</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="mono">
                {domain.records.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 align-top">
                    <td className="py-2.5 pr-4"><span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{r.type}</span></td>
                    <td className="py-2.5 pr-4 break-all max-w-[220px]">{r.name}</td>
                    <td className="py-2.5 pr-4 break-all max-w-[280px]">{r.value}</td>
                    <td className="py-2.5 pr-2"><StatusBadge status={r.status} /></td>
                    <td className="py-2.5"><CopyButton value={r.value} className="!px-2 !py-1 text-xs" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold">Enable tracking metrics</h3>
            <p className="text-sm text-fg-muted mt-1">
              To track clicks and opens, configure a custom tracking subdomain so links match your sending domain and improve deliverability.
            </p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="badge" style={{ background: "var(--bg-hover)", color: domain.clickTracking ? "var(--success)" : "var(--fg-subtle)" }}>
                Click tracking: {domain.clickTracking ? "On" : "Off"}
              </span>
              <span className="badge" style={{ background: "var(--bg-hover)", color: domain.openTracking ? "var(--success)" : "var(--fg-subtle)" }}>
                Open tracking: {domain.openTracking ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold">TLS (Transport Layer Security)</h3>
            <p className="text-sm text-fg-muted mt-1">
              “Opportunistic TLS” attempts a secure connection and falls back to unencrypted if unavailable.
              “Enforced TLS” requires TLS for every message.
            </p>
            <select
              className="input w-56 mt-3"
              value={domain.tlsMode}
              onChange={(e) => setTls(e.target.value as "opportunistic" | "enforced")}
              disabled={pending}
            >
              <option value="opportunistic">Opportunistic</option>
              <option value="enforced">Enforced</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
