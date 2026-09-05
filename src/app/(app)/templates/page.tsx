import { createElement } from "react";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { renderEmail, WelcomeEmail } from "@/emails";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SendTemplateForm } from "@/components/dashboard/SendTemplateForm";

export const dynamic = "force-dynamic";

const SNIPPET = `import { NanoSend } from "nanosend";
import { WelcomeEmail } from "./emails/WelcomeEmail";

const ns = new NanoSend("ns_live_...");

await ns.emails.send({
  from: "Acme <hello@acme.com>",
  to: "user@example.com",
  subject: "Welcome to Acme 👋",
  react: <WelcomeEmail name="Ada" product="Acme" />,
});`;

export default async function TemplatesPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const verified = await Domain.findOne({
    workspaceId: workspace._id,
    status: "verified",
  }).lean();
  const defaultFrom = verified
    ? `${workspace.name} <hello@${verified.name}>`
    : `${workspace.name} <onboarding@resend.dev>`;

  // Server-render the React Email component to HTML for the live preview.
  const html = await renderEmail(
    createElement(WelcomeEmail, { name: "Ada", product: workspace.name }),
  );

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Design emails as React components with React Email. Rendered to HTML at send time — pass a component straight to the SDK."
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">WelcomeEmail — live preview</span>
            <code className="mono text-xs text-fg-subtle">src/emails/WelcomeEmail.tsx</code>
          </div>
          <iframe
            title="template-preview"
            srcDoc={html}
            className="w-full bg-white"
            style={{ height: 520 }}
          />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Try it</h2>
            <SendTemplateForm defaultFrom={defaultFrom} />
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border text-xs text-fg-subtle mono">
              send-with-react.tsx
            </div>
            <pre className="mono text-[12px] leading-relaxed p-4 overflow-x-auto">
              <code>{SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
