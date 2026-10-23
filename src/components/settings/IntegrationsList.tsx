"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/CopyButton";

export function IntegrationsList({ base }: { base: string }) {
  const [open, setOpen] = useState<"mcp" | "supabase" | "vercel" | null>(null);
  const mcpJson = JSON.stringify({ mcpServers: { stackemails: { type: "http", url: `${base}/api/mcp`, headers: { Authorization: "Bearer se_live_YOUR_KEY" } } } }, null, 2);
  const claudeCode = `claude mcp add --transport http stackemails ${base}/api/mcp --header "Authorization: Bearer se_live_YOUR_KEY"`;

  const items = [
    { id: "mcp" as const, name: "MCP server", badge: "New", desc: "Send emails, read deliveries and manage contacts from Claude, Cursor and other AI tools.", cta: "Configure MCP" },
    { id: "supabase" as const, name: "Supabase", desc: "Send Supabase Auth emails (sign-up, magic links, password resets) through Stack Emails via SMTP.", cta: "Connect to Supabase" },
    { id: "vercel" as const, name: "Vercel", desc: "Add your Stack Emails API key to a Vercel project as an environment variable.", cta: "Set up on Vercel" },
  ];

  return (
    <div className="space-y-4">
      {items.map((i) => (
        <div key={i.id} className="card p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-normal">{i.name}</h2>
            {i.badge && <span className="badge" style={{ background: "color-mix(in srgb, var(--violet) 18%, transparent)", color: "var(--violet)" }}>{i.badge}</span>}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{i.desc}</p>
          <button className="btn btn-secondary mt-4" onClick={() => setOpen(i.id)}>{i.cta}</button>
        </div>
      ))}

      <Modal open={open === "mcp"} onClose={() => setOpen(null)} title="Stack Emails MCP server" description="Connect any MCP client over Streamable HTTP. Use an API key with sending access if the agent should only send." width="max-w-2xl">
        <div className="space-y-4 text-sm">
          <Block label="Endpoint" code={`${base}/api/mcp`} />
          <Block label="Claude Code" code={claudeCode} />
          <Block label="Claude Desktop / Cursor (mcp.json)" code={mcpJson} />
          <div>
            <p className="label">Tools</p>
            <p className="text-fg-muted"><code className="mono text-xs">send_email</code>, <code className="mono text-xs">list_emails</code>, <code className="mono text-xs">get_email</code>, <code className="mono text-xs">list_domains</code>, <code className="mono text-xs">create_contact</code>, <code className="mono text-xs">list_contacts</code>, <code className="mono text-xs">list_segments</code>, <code className="mono text-xs">list_received_emails</code></p>
          </div>
          <p className="text-xs text-fg-subtle">Every tool call is checked against your domains, quotas and suppressions and appears in Logs.</p>
        </div>
      </Modal>

      <Modal open={open === "supabase"} onClose={() => setOpen(null)} title="Use Stack Emails with Supabase Auth" width="max-w-xl">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
          <li>Verify your sending domain under Domains.</li>
          <li>In Supabase: Authentication → Emails → SMTP Settings → enable custom SMTP.</li>
          <li>Host <code className="mono">smtp.stackemails.com</code>, port <code className="mono">465</code>, username <code className="mono">stackemails</code>, password = a Stack Emails API key.</li>
          <li>Sender email: an address on your verified domain (e.g. <code className="mono">auth@yourdomain.com</code>).</li>
          <li>Save, then send a magic link to yourself — it shows up in Emails with source “SMTP”.</li>
        </ol>
      </Modal>

      <Modal open={open === "vercel"} onClose={() => setOpen(null)} title="Use Stack Emails on Vercel" width="max-w-xl">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
          <li>Create an API key under API keys (sending access is enough for most apps).</li>
          <li>In Vercel: Project → Settings → Environment Variables → add <code className="mono">STACKEMAILS_API_KEY</code>.</li>
          <li>Install the SDK: <code className="mono">npm install stackemails</code>.</li>
          <li><code className="mono">new StackEmails()</code> reads <code className="mono">STACKEMAILS_API_KEY</code> automatically.</li>
        </ol>
        <div className="mt-4"><Block label="Vercel CLI" code="vercel env add STACKEMAILS_API_KEY production" /></div>
      </Modal>
    </div>
  );
}

function Block({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between"><span className="label !mb-0">{label}</span><CopyButton value={code} className="!px-2 !py-1" /></div>
      <pre className="mono overflow-x-auto rounded-xl p-3 text-xs text-fg-muted" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>{code}</pre>
    </div>
  );
}
