import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { getEmailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { SystemEmailLog } from "@/lib/db/models";
import { connectToDatabase } from "@/lib/db/connect";

export type SystemEmailKind = "welcome" | "password_reset" | "password_changed" | "receipt" | "invite" | "ticket_opened" | "ticket_reply" | "ticket_alert" | "contact_form" | "account_notice";

/**
 * Send a platform email (welcome, password reset, receipt) from
 * SYSTEM_FROM_EMAIL straight through the configured provider.
 *
 * These deliberately bypass the tenant pipeline (queue, quotas, EmailLog):
 * they're Stack Emails' own mail, not a customer's, and must still go out
 * when a workspace is over quota or restricted.
 *
 * Never throws — a failed system email must not fail signup or checkout.
 */
export async function sendSystemEmail(opts: {
  kind: SystemEmailKind;
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    await connectToDatabase();
    const [html, text] = await Promise.all([
      render(opts.react),
      render(opts.react, { plainText: true }),
    ]);
    const result = await getEmailProvider().send({
      from: env.systemFromEmail,
      to: [opts.to],
      replyTo: [env.supportEmail],
      subject: opts.subject,
      html,
      text,
      tags: [{ name: "stackemails_system", value: opts.kind }],
    });
    console.info(`[system-email] ${opts.kind} → ${opts.to} sent (${result.providerMessageId})`);
    SystemEmailLog.create({ kind: opts.kind, to: opts.to, subject: opts.subject, status: "sent", providerMessageId: result.providerMessageId }).catch(() => {});
    return { ok: true, messageId: result.providerMessageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[system-email] ${opts.kind} → ${opts.to} FAILED: ${error}`);
    SystemEmailLog.create({ kind: opts.kind, to: opts.to, subject: opts.subject, status: "failed", error: error.slice(0, 1000) }).catch(() => {});
    return { ok: false, error };
  }
}
