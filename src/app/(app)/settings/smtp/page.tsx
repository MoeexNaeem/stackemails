import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

export const metadata: Metadata = { title: "SMTP" };

const FIELDS = [
  { label: "Host", value: "smtp.stackemails.com" },
  { label: "Port", value: "465", help: "Implicit TLS. For STARTTLS use 587 or 2587." },
  { label: "Username", value: "stackemails" },
  { label: "Password", value: "YOUR_API_KEY", help: "Any API key from the API keys page (sending access is enough)." },
];

export default function SmtpPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card p-6">
        <h2 className="font-medium">SMTP credentials</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Send email over SMTP instead of the REST API, which is useful for Supabase Auth, WordPress, Laravel, Django and other tools with SMTP settings.{" "}
          <Link href="/docs#smtp" className="text-accent hover:underline">See documentation</Link>.
        </p>
        <div className="mt-5 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.label}>
              <label className="label">{f.label}</label>
              <div className="flex items-center gap-2">
                <code className="mono flex-1 rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>{f.value}</code>
                <CopyButton value={f.value} className="!px-2 !py-1.5" />
              </div>
              {f.help && <p className="mt-1 text-xs text-fg-subtle">{f.help}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="card h-fit p-6 text-sm">
        <p className="font-medium">How SMTP sends work</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-fg-muted">
          <li>Messages go through the same pipeline as the API: quotas, domain verification, suppressions and webhooks all apply.</li>
          <li>The From address must be on a domain you&apos;ve verified.</li>
          <li>Envelope recipients not in To/Cc are treated as Bcc.</li>
          <li>Each SMTP message appears in Emails and Logs with source “SMTP”.</li>
        </ul>
      </div>
    </div>
  );
}
