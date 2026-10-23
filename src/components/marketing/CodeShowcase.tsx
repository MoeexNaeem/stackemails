"use client";

import { useState } from "react";
import { sendEmailSnippets } from "@/lib/code-snippets";

const LANGS = ["Node.js", "Python", "PHP", "Go", "Ruby", "cURL"];

/** Dark code card with language tabs (marketing). */
export function CodeShowcase() {
  const snippets = sendEmailSnippets({ from: "Acme <hello@acme.com>", to: "you@example.com", subject: "Hello world", html: "<p>It works!</p>" }).filter((s) => LANGS.includes(s.lang));
  const [lang, setLang] = useState("Node.js");
  const active = snippets.find((s) => s.lang === lang) ?? snippets[0];
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-[22px] border" style={{ background: "#15171a", borderColor: "#262a30" }}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5" style={{ borderColor: "#262a30" }}>
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Language">
          {snippets.map((s) => (
            <button key={s.lang} role="tab" aria-selected={s.lang === lang} onClick={() => setLang(s.lang)} className="whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] transition" style={{ background: s.lang === lang ? "#262a30" : "transparent", color: s.lang === lang ? "#fff" : "#94a3b8" }}>
              {s.lang}
            </button>
          ))}
        </div>
        <button
          className="rounded-full px-3 py-1 text-[12px]"
          style={{ color: "#94a3b8", border: "1px solid #262a30" }}
          onClick={() => {
            navigator.clipboard?.writeText(active.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[360px] overflow-auto p-5 text-[13px] leading-relaxed" style={{ color: "#e5e7eb", fontFamily: "var(--font-mono)" }}><code>{active.code}</code></pre>
    </div>
  );
}
