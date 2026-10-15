import { connectToDatabase } from "@/lib/db/connect";
import { User, Workspace, Membership, ApiKey, Domain, EmailLog } from "@/lib/db/models";
import { createAccount } from "@/lib/accounts";
import { generateApiKey } from "@/lib/auth/apiKey";
import { buildDnsRecords } from "@/lib/dns";
import { getEmailProvider } from "@/lib/email";
import { prefixedId } from "@/lib/ids";

export const DEMO_EMAIL = "demo@nanosend.dev";
export const DEMO_PASSWORD = "password123";

/**
 * Populate a demo workspace (account, verified domain, API key, sample emails).
 * Idempotent: if the demo user already exists, it does nothing and returns null.
 * Returns the raw API key exactly once on creation.
 */
export async function seedDemoData(): Promise<{ apiKey: string } | null> {
  await connectToDatabase();

  if (await User.findOne({ email: DEMO_EMAIL })) return null;

  await createAccount({
    name: "Demo User",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    workspaceName: "Acme Inc.",
  });

  const user = await User.findOne({ email: DEMO_EMAIL });
  const membership = await Membership.findOne({ userId: user!._id });
  const wid = membership!.workspaceId;

  const { raw, keyHash, last4, keyPrefix } = generateApiKey("live");
  await ApiKey.create({
    workspaceId: wid,
    name: "Default key",
    mode: "live",
    keyHash,
    last4,
    keyPrefix,
    permission: "full_access",
    domainScope: "all",
  });

  const identity = await getEmailProvider().createDomainIdentity("acme.com", "us-east-1");
  await Domain.create({
    workspaceId: wid,
    name: "acme.com",
    region: "us-east-1",
    status: "verified",
    verifiedAt: new Date(),
    records: buildDnsRecords("acme.com", identity.dkimTokens).map((r) => ({
      ...r,
      status: "verified",
    })),
    dkimTokens: identity.dkimTokens,
    awsIdentityArn: identity.arn,
  });

  const samples = [
    { subject: "Welcome to Acme 👋", status: "delivered" as const },
    { subject: "Reset your password", status: "delivered" as const },
    { subject: "Your invoice for October", status: "sent" as const },
    { subject: "Weekly digest", status: "bounced" as const },
  ];

  for (const s of samples) {
    await EmailLog.create({
      workspaceId: wid,
      messageId: prefixedId("msg"),
      from: "Acme <hello@acme.com>",
      to: ["customer@example.com"],
      subject: s.subject,
      html: `<h1>${s.subject}</h1><p>Sample email seeded for the demo.</p>`,
      status: s.status,
      sentAt: new Date(),
      deliveredAt: s.status === "delivered" ? new Date() : undefined,
      awsMessageId: `mock-${Math.random().toString(16).slice(2)}`,
      events: [
        { type: "queued", at: new Date() },
        { type: "sent", at: new Date() },
        ...(s.status === "delivered" ? [{ type: "delivered" as const, at: new Date() }] : []),
        ...(s.status === "bounced" ? [{ type: "bounced" as const, at: new Date() }] : []),
      ],
    });
  }

  await Workspace.updateOne({ _id: wid }, { $set: { "usage.sent": samples.length } });
  return { apiKey: raw };
}
