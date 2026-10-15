const INTEGRATIONS = [
  { name: "MCP server", badge: "New", desc: "Send emails, manage contacts, and more from your AI tools.", cta: "Configure MCP" },
  { name: "Supabase", desc: "Integrate your Supabase account to send emails from Supabase Auth via SMTP.", cta: "Connect to Supabase" },
  { name: "Vercel", desc: "Integrate your NanoSend API keys with Vercel environment variables.", cta: "Go to Vercel Integration" },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      {INTEGRATIONS.map((i) => (
        <div key={i.name} className="card p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{i.name}</h2>
            {i.badge && (
              <span className="badge" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
                {i.badge}
              </span>
            )}
          </div>
          <p className="text-sm text-fg-muted mt-1">{i.desc}</p>
          <button className="btn btn-secondary mt-4">{i.cta}</button>
        </div>
      ))}
    </div>
  );
}
