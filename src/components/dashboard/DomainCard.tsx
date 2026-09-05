"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { verifyDomainAction, deleteDomainAction } from "@/app/(app)/actions";

type DnsRecord = {
  type: string;
  name: string;
  value: string;
  purpose: string;
  status: string;
};

export type DomainView = {
  id: string;
  name: string;
  region: string;
  status: string;
  records: DnsRecord[];
  createdAt: string;
};

export function DomainCard({ domain }: { domain: DomainView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(domain.status !== "verified");

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
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button className="flex items-center gap-3 min-w-0" onClick={() => setOpen((o) => !o)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="2"
            style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className="font-medium mono truncate">{domain.name}</span>
          <StatusBadge status={domain.status} />
          <span className="text-xs text-fg-subtle">{domain.region}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button className="btn btn-secondary" onClick={verify} disabled={pending}>
            {pending ? "Checking…" : "Verify"}
          </button>
          <button className="btn btn-danger" onClick={remove} disabled={pending}>
            Delete
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-sm text-fg-muted mb-3">
            Add these records at your DNS provider, then click <strong>Verify</strong>.
          </p>
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
                    <td className="py-2.5 pr-4">
                      <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
                        {r.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 break-all max-w-[220px]">{r.name}</td>
                    <td className="py-2.5 pr-4 break-all max-w-[280px]">{r.value}</td>
                    <td className="py-2.5 pr-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2.5">
                      <CopyButton value={r.value} className="!px-2 !py-1 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
