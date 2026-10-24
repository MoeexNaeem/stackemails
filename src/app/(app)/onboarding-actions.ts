"use server";

import { revalidatePath } from "next/cache";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, EmailLog } from "@/lib/db/models";
import { generateApiKey } from "@/lib/auth/apiKey";
import { getEmailProvider } from "@/lib/email";
import { getRateLimiter } from "@/lib/ratelimit";
import { prefixedId } from "@/lib/ids";
import { bumpStat } from "@/lib/stats";
import { senderDomain } from "@/lib/email/guards";
import { env } from "@/lib/env";

export async function createOnboardingKeyAction(): Promise<{ ok: boolean; key?: string; error?: string }> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const { raw, keyHash, last4, keyPrefix } = generateApiKey("live");
  await ApiKey.create({ workspaceId: workspace._id, name: "Onboarding", mode: "live", keyHash, last4, keyPrefix, permission: "full_access", createdBy: user._id });
  revalidatePath("/api-keys");
  return { ok: true, key: raw };
}

/**
 * Sandbox send: from the platform's onboarding address to the signed-in user's
 * own email only (like Resend's onboarding sender), so new teams can see a real
 * email arrive before verifying a domain. Logged in their Emails list.
 */
export async function sendOnboardingEmailAction(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const rl = await getRateLimiter().check(`onboarding-send:${user._id}`, 5, 3600_000);
  if (!rl.allowed) return { ok: false, error: "You've sent a few test emails already. Try again in an hour." };

  const domain = senderDomain(env.systemFromEmail) ?? "stackemails.com";
  const from = `Stack Emails <onboarding@${domain}>`;
  const subject = "Hello World";
  const html = `<p>Congrats on sending your <strong>first email</strong> with Stack Emails!</p><p>Next: verify your own domain to send to anyone.</p>`;
  const log = await EmailLog.create({
    workspaceId: workspace._id,
    messageId: prefixedId("msg"),
    from,
    to: [user.email],
    subject,
    html,
    status: "queued",
    source: "dashboard",
    events: [{ type: "queued", at: new Date(), detail: "Onboarding sandbox send" }],
  });
  try {
    const res = await getEmailProvider().send({ from, to: [user.email], subject, html, text: "Congrats on sending your first email with Stack Emails!", tags: [{ name: "stackemails_email_id", value: String(log._id) }] });
    log.status = env.emailProvider === "mock" ? "delivered" : "sent";
    log.awsMessageId = res.providerMessageId;
    log.sentAt = new Date();
    log.events.push({ type: "sent", at: new Date() });
    if (env.emailProvider === "mock") log.events.push({ type: "delivered", at: new Date(), detail: "simulated" });
    await log.save();
    await bumpStat(workspace._id, from, { total: 1, sent: 1, ...(env.emailProvider === "mock" ? { delivered: 1 } : {}) });
    revalidatePath("/emails");
    revalidatePath("/overview");
    return { ok: true, message: `Sent to ${user.email}. Check your inbox.` };
  } catch (err) {
    log.status = "failed";
    log.errorMessage = err instanceof Error ? err.message : String(err);
    log.events.push({ type: "failed", at: new Date(), detail: log.errorMessage });
    await log.save();
    return { ok: false, error: `Couldn't send: ${log.errorMessage}` };
  }
}
