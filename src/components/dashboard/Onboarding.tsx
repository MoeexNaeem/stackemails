"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CopyButton } from "@/components/CopyButton";
import { sendEmailSnippets } from "@/lib/code-snippets";
import { createOnboardingKeyAction, sendOnboardingEmailAction } from "@/app/(app)/onboarding-actions";

const AGENT_PROMPT = (email: string) => `Install the "stackemails" npm package in this project and add a small helper that sends transactional email with it.
Read the API key from the STACKEMAILS_API_KEY environment variable. Send a test email to ${email} with the subject "Hello World".
Docs: https://stackemails.com/docs — API base: https://stackemails.com/v1`;

export function Onboarding({ userEmail, hasKey, verifiedDomain, hasSent, teamName }: { userEmail: string; hasKey: boolean; verifiedDomain: string | null; hasSent: boolean; teamName: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [lang, setLang] = useState("Node.js");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [pending, start] = useTransition();
  const from = verifiedDomain ? `${teamName} <hello@${verifiedDomain}>` : "Stack Emails <onboarding@stackemails.com>";
  const snippets = useMemo(() => sendEmailSnippets({ key: key ?? "se_live_xxxxxxxxx", from, to: userEmail }), [key, from, userEmail]);
  const active = snippets.find((s) => s.lang === lang) ?? snippets[0];
  const step1Done = hasKey || !!key;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-normal tracking-[-0.02em]">Send your first email</h1>
          <p className="mt-1 text-sm text-fg-muted">Follow the steps to send an email using the Stack Emails API.</p>
        </div>
        <div className="relative">
          <button className="btn btn-secondary btn-sm" onClick={() => setAgentOpen((o) => !o)} aria-expanded={agentOpen}>Set up with your agent ▾</button>
          {agentOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-[380px] rounded-2xl border border-border-strong p-4 shadow-2xl" style={{ background: "var(--bg-elevated)" }}>
              <p className="text-sm font-medium">Prompt for Claude Code, Cursor or any coding agent</p>
              <pre className="mono mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl p-3 text-xs text-fg-muted" style={{ background: "var(--bg)" }}>{AGENT_PROMPT(userEmail)}</pre>
              <div className="mt-2 flex justify-between">
                <Link href="/settings/integrations" className="text-xs text-accent hover:underline">Install the MCP server →</Link>
                <CopyButton value={AGENT_PROMPT(userEmail)} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ol className="relative space-y-10 border-l border-border-strong pl-8">
        <Step n={1} done={step1Done} title="Add an API key" desc="Use the following generated key to authenticate requests">
          {key ? (
            <div className="rounded-2xl border border-border-strong p-4" style={{ background: "var(--bg-elevated)" }}>
              <p className="text-xs text-warning mb-2">Copy it now — you won&apos;t be able to see it again.</p>
              <div className="flex items-center gap-2">
                <code className="mono flex-1 break-all text-sm">{key}</code>
                <CopyButton value={key} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await createOnboardingKeyAction(); if (r.key) setKey(r.key); })}>
                🔑 {hasKey ? "Create another key" : "Add API key"}
              </button>
              {hasKey && <span className="text-xs text-fg-subtle">You already have a key — find it under <Link href="/api-keys" className="text-accent hover:underline">API keys</Link>.</span>}
            </div>
          )}
        </Step>

        <Step n={2} done={hasSent} title="Send an email" desc="Implement or run the code below to send your first email">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="flex flex-wrap gap-1 overflow-x-auto">
                {snippets.map((s) => (
                  <button key={s.lang} className="tab !px-2.5 !py-1 text-xs" data-active={s.lang === active.lang} onClick={() => setLang(s.lang)}>{s.lang}</button>
                ))}
              </div>
              <CopyButton value={active.code} className="!px-2 !py-1" />
            </div>
            <pre className="mono max-h-[360px] overflow-auto p-4 text-[12.5px] leading-relaxed"><code>{active.code}</code></pre>
          </div>
          {!verifiedDomain && <p className="mt-2 text-xs text-fg-subtle">Until you verify a domain, the onboarding sender can only deliver to your own address ({userEmail}).</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await sendOnboardingEmailAction(); setNote({ ok: r.ok, text: r.error ?? r.message ?? "" }); })}>
              ✉ Send email
            </button>
            {note && <span className="text-sm" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</span>}
          </div>
        </Step>

        <Step n={3} done={!!verifiedDomain} title="Explore more" desc="Finish setting up and unlock Stack Emails' full capabilities.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Explore href="/domains" title="Add a domain" badge={!verifiedDomain ? "Recommended" : "Done"} body="Verify and send emails from your own custom domains." cta="Add domain" />
            <Explore href="/settings/integrations" title="Install MCP" body="Connect your AI tools and agents to send emails with Stack Emails." cta="Install MCP" />
            <Explore href="/blog/email-deliverability-guide" title="Deliverability tips" body="Avoiding the spam folder and reaching the inbox." cta="Learn more" />
          </div>
        </Step>
      </ol>
    </div>
  );
}

function Step({ n, done, title, desc, children }: { n: number; done: boolean; title: string; desc: string; children: React.ReactNode }) {
  return (
    <li className="relative">
      <span
        className="absolute -left-[41px] top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px]"
        style={{ background: done ? "var(--lime)" : "var(--bg)", border: `2px solid ${done ? "var(--lime)" : "var(--border-strong)"}`, color: "#15171a" }}
        aria-label={done ? `Step ${n} complete` : `Step ${n}`}
      >
        {done ? "✓" : ""}
      </span>
      <h2 className="text-lg font-normal">{title}</h2>
      <p className="mb-4 text-sm text-fg-muted">{desc}</p>
      {children}
    </li>
  );
}

function Explore({ href, title, body, cta, badge }: { href: string; title: string; body: string; cta: string; badge?: string }) {
  return (
    <Link href={href} className="card block p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        {badge && <span className="badge" style={{ background: "color-mix(in srgb, var(--lime) 14%, transparent)", color: "var(--lime)" }}>{badge}</span>}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{body}</p>
      <p className="mt-3 text-xs text-accent">{cta} →</p>
    </Link>
  );
}
