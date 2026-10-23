"use client";

import { useState } from "react";

/**
 * Preview / HTML / Plain text tabs. HTML renders inside a sandboxed iframe with
 * scripts disabled, so a malicious received email can't run code in the dashboard.
 */
export function EmailPreview({ html, text }: { html: string | null; text: string | null }) {
  const tabs = [...(html ? (["preview", "html"] as const) : []), ...(text ? (["text"] as const) : [])];
  const [tab, setTab] = useState<(typeof tabs)[number] | undefined>(tabs[0]);
  if (!tabs.length) return <div className="card p-6 text-sm text-fg-subtle">This email has no body.</div>;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {tabs.map((t) => (
          <button key={t} className="tab" data-active={tab === t} onClick={() => setTab(t)}>
            {t === "preview" ? "Preview" : t === "html" ? "HTML" : "Plain text"}
          </button>
        ))}
      </div>
      {tab === "preview" && html && (
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={html}
          className="w-full bg-white"
          style={{ height: 560, border: 0 }}
        />
      )}
      {tab === "html" && <pre className="mono max-h-[560px] overflow-auto p-5 text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">{html}</pre>}
      {tab === "text" && <pre className="max-h-[560px] overflow-auto p-5 text-sm leading-relaxed whitespace-pre-wrap text-fg-muted">{text}</pre>}
    </div>
  );
}
