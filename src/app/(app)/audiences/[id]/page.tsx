import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Audience, Contact, Domain } from "@/lib/db/models";
import { AudienceDetail, type ContactView } from "@/components/dashboard/AudienceDetail";

export const dynamic = "force-dynamic";

export default async function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();

  const audience = await Audience.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!audience) notFound();

  const [contacts, verified] = await Promise.all([
    Contact.find({ workspaceId: workspace._id, audienceId: id }).sort({ createdAt: -1 }).lean(),
    Domain.findOne({ workspaceId: workspace._id, status: "verified" }).lean(),
  ]);

  const views: ContactView[] = contacts.map((c) => ({
    id: String(c._id),
    email: c.email,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    unsubscribed: c.unsubscribed,
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  const defaultFrom = verified
    ? `${workspace.name} <hello@${verified.name}>`
    : `${workspace.name} <onboarding@resend.dev>`;

  return (
    <div>
      <Link href="/audiences" className="text-sm text-fg-muted hover:text-fg">
        ← Back to audiences
      </Link>
      <h1 className="mt-3 mb-8 text-2xl font-semibold tracking-tight">{audience.name}</h1>
      <AudienceDetail audienceId={id} contacts={views} defaultFrom={defaultFrom} />
    </div>
  );
}
