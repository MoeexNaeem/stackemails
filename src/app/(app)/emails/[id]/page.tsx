import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();

  const email = await EmailLog.findOne({ workspaceId: workspace._id, messageId: id }).lean();
  if (!email) notFound();

  return (
    <div>
      <Link href="/emails" className="text-sm text-fg-muted hover:text-fg">
        ← Back to emails
      </Link>
      <h1 className="mt-3 mb-8 text-2xl font-semibold tracking-tight">{email.subject}</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-3 text-sm">
            <Row label="Message ID" value={<code className="mono text-accent">{email.messageId}</code>} />
            <Row label="Status" value={<StatusBadge status={email.status} />} />
            <Row label="From" value={email.from} />
            <Row label="To" value={email.to.join(", ")} />
            {email.cc.length > 0 && <Row label="Cc" value={email.cc.join(", ")} />}
            {email.replyTo.length > 0 && <Row label="Reply-To" value={email.replyTo.join(", ")} />}
            {email.awsMessageId && (
              <Row label="Provider ID" value={<code className="mono text-xs">{email.awsMessageId}</code>} />
            )}
            {email.errorMessage && (
              <Row label="Error" value={<span style={{ color: "var(--danger)" }}>{email.errorMessage}</span>} />
            )}
          </div>

          {email.html && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border text-sm font-medium">
                HTML preview
              </div>
              <iframe
                title="email-preview"
                srcDoc={email.html}
                className="w-full bg-white"
                style={{ height: 360 }}
              />
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Timeline</h3>
          <ol className="space-y-4">
            {email.events.map((ev, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: "var(--accent)" }} />
                  {i < email.events.length - 1 && (
                    <span className="w-px flex-1 mt-1" style={{ background: "var(--border-strong)" }} />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium capitalize">{ev.type}</p>
                  <p className="text-xs text-fg-subtle">{new Date(ev.at).toLocaleString()}</p>
                  {ev.detail && <p className="text-xs text-fg-muted mt-0.5">{ev.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-fg-subtle w-28 shrink-0">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
