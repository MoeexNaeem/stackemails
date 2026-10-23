"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { sendTestInboundAction } from "@/app/(app)/emails-actions";

/** Shows the team's receiving address and lets the user fire a test email through the inbound pipeline. */
export function ReceivingAddress({ domain, inboxId, compact = false }: { domain: string; inboxId?: string; compact?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className={compact ? "" : "flex flex-col items-center"}>
      <div className="inline-flex items-center gap-2 rounded-xl border border-border-strong px-3 py-1.5" style={{ background: "var(--bg-elevated)" }}>
        <code className="mono text-[13px]">&lt;anything&gt;@{domain}</code>
        <CopyButton value={`hello@${domain}`} className="!px-2 !py-1" />
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm mt-3"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sendTestInboundAction(inboxId);
            setNote(r.error ?? r.message ?? null);
            router.refresh();
          })
        }
      >
        {pending ? "Delivering…" : "Send a test email to this address"}
      </button>
      {note && <p className="mt-2 text-xs text-fg-muted">{note}</p>}
    </div>
  );
}
