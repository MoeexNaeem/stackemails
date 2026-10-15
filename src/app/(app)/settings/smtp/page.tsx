import { CopyButton } from "@/components/CopyButton";

const FIELDS = [
  { label: "Host", value: "smtp.nanosend.dev" },
  { label: "Port", value: "465" },
  { label: "User", value: "nanosend" },
  { label: "Password", value: "YOUR_API_KEY" },
];

export default function SmtpPage() {
  return (
    <div className="card p-6 max-w-xl">
      <h2 className="font-semibold">SMTP</h2>
      <p className="text-sm text-fg-muted mt-1">
        Send emails using SMTP instead of the REST API.{" "}
        <a href="/docs" className="text-accent hover:underline">See documentation</a> for more information.
      </p>

      <div className="mt-5 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.label}>
            <label className="label">{f.label}</label>
            <div className="flex items-center gap-2">
              <code className="mono text-sm flex-1 rounded-lg px-3 py-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
                {f.value}
              </code>
              <CopyButton value={f.value} className="!px-2 !py-1.5" />
            </div>
            {f.label === "Port" && (
              <p className="text-xs text-fg-subtle mt-1">For encrypted/TLS connections use 2465, 587, or 2587.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
