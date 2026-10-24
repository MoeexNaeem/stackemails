"use client";

import { useEffect, useState } from "react";
import { CODE_SNIPPETS } from "@/lib/code-snippets";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/ui/Icon";

const TITLES: Record<string, string> = {
  emails: "Emails API",
  domains: "Domains API",
  "api-keys": "API Keys API",
  audience: "Contacts API",
  broadcasts: "Broadcasts API",
  webhooks: "Webhooks",
};

export function CodeDrawer({ resource }: { resource: keyof typeof CODE_SNIPPETS | string }) {
  const snippets = CODE_SNIPPETS[resource] ?? CODE_SNIPPETS.emails;
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(snippets[0]?.lang ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const active = snippets.find((s) => s.lang === lang) ?? snippets[0];

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary !px-2.5"
        title="View code"
        onClick={() => setOpen(true)}
        aria-label="View code"
      >
        <span className="mono text-sm">&lt;/&gt;</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto p-6" style={{ background: "var(--bg-elevated)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">{TITLES[resource] ?? "API"}</h2>
              <button className="btn btn-ghost px-2" onClick={() => setOpen(false)}><Icon name="x" size={16} /></button>
            </div>

            <div className="flex gap-1 mb-4 flex-wrap">
              {snippets.map((s) => (
                <button key={s.lang} className="tab" data-active={s.lang === active.lang} onClick={() => setLang(s.lang)}>
                  {s.lang}
                </button>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs text-fg-subtle mono">{active.lang}</span>
                <CopyButton value={active.code} className="!px-2 !py-1 text-xs" />
              </div>
              <pre className="mono text-[13px] leading-relaxed p-4 overflow-x-auto">
                <code>{active.code}</code>
              </pre>
            </div>

            <a href="/docs" className="text-sm text-accent hover:underline mt-4 inline-block">
              View full documentation <Icon name="arrow-right" size={14} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
