/**
 * SMTP relay: lets customers send through Stack Emails from any SMTP client
 * (Supabase Auth, WordPress, legacy apps).
 *
 *   host: smtp.stackemails.com   ports: 465 (implicit TLS) · 587 / 2587 (STARTTLS)
 *   user: stackemails            pass: an API key (se_live_…)
 *
 * Configure with SMTP_PORT (and optional SMTP_TLS_PORT), plus SMTP_TLS_KEY /
 * SMTP_TLS_CERT (PEM file paths) in production. Every message goes through the
 * same createAndQueueEmail pipeline as the REST API.
 */
import { readFileSync } from "node:fs";
import { SMTPServer, type SMTPServerOptions } from "smtp-server";
import { simpleParser, type AddressObject } from "mailparser";
import { authenticateApiKey } from "@/lib/auth/apiAuth";
import { getRateLimiter } from "@/lib/ratelimit";
import { createAndQueueEmail } from "@/lib/email/send";
import { ApiLog, type ApiKeyDoc, type WorkspaceDoc } from "@/lib/db/models";

type Session = { user?: { workspace: WorkspaceDoc; apiKey: ApiKeyDoc } };

function addresses(a?: AddressObject | AddressObject[]): string[] {
  const list = Array.isArray(a) ? a : a ? [a] : [];
  return list.flatMap((x) => x.value.map((v) => v.address).filter((v): v is string => !!v));
}

function baseOptions(): SMTPServerOptions {
  const key = process.env.SMTP_TLS_KEY;
  const cert = process.env.SMTP_TLS_CERT;
  return {
    name: "smtp.stackemails.com",
    banner: "Stack Emails SMTP relay",
    authMethods: ["PLAIN", "LOGIN"],
    authOptional: false,
    size: 10 * 1024 * 1024,
    disabledCommands: key && cert ? [] : ["STARTTLS"],
    allowInsecureAuth: !(key && cert), // dev only - production must provide TLS
    ...(key && cert ? { key: readFileSync(key), cert: readFileSync(cert) } : {}),

    async onAuth(auth, session, callback) {
      if (auth.username !== "stackemails") return callback(new Error("Username must be 'stackemails'"));
      const res = await authenticateApiKey(String(auth.password ?? ""));
      if (!res.ok) return callback(new Error(res.message));
      callback(null, { user: { workspace: res.workspace, apiKey: res.apiKey } });
    },

    onData(stream, session, callback) {
      const user = (session as unknown as Session).user;
      if (!user) return callback(new Error("Authentication required"));
      const started = Date.now();
      simpleParser(stream)
        .then(async (mail) => {
          const rl = await getRateLimiter().check(`smtp:${user.apiKey._id}`, 20, 1000);
          if (!rl.allowed) throw Object.assign(new Error("Rate limit exceeded, try again shortly"), { responseCode: 451 });

          const from = mail.from?.text ?? session.envelope.mailFrom?.toString() ?? "";
          const headerTo = addresses(mail.to);
          const headerCc = addresses(mail.cc);
          const envelope = session.envelope.rcptTo.map((r) => r.address.toLowerCase());
          // Envelope recipients not in To/Cc are Bcc.
          const bcc = envelope.filter((r) => !headerTo.map((x) => x.toLowerCase()).includes(r) && !headerCc.map((x) => x.toLowerCase()).includes(r));

          const result = await createAndQueueEmail(user.workspace, {
            from,
            to: headerTo.length ? headerTo : envelope,
            cc: headerCc,
            bcc,
            replyTo: addresses(mail.replyTo),
            subject: mail.subject ?? "(no subject)",
            html: typeof mail.html === "string" ? mail.html : undefined,
            text: mail.text ?? undefined,
            attachments: mail.attachments.map((a) => ({ filename: a.filename ?? "attachment", content: a.content, contentType: a.contentType })),
            source: "smtp",
            apiKeyId: user.apiKey._id,
          });
          ApiLog.create({
            workspaceId: user.workspace._id, endpoint: "/smtp", method: "SMTP", status: result.ok ? 202 : result.status,
            source: "smtp", userAgent: "stackemails-smtp", durationMs: Date.now() - started, apiKeyId: user.apiKey._id,
          }).catch(() => {});
          if (!result.ok) throw Object.assign(new Error(result.message), { responseCode: result.status === 429 ? 452 : 550 });
          callback(null, `Queued as ${result.email.messageId}`);
        })
        .catch((err) => callback(err));
    },
  };
}

export function startSmtpRelay() {
  const port = Number(process.env.SMTP_PORT || 587);
  new SMTPServer(baseOptions()).listen(port, () => console.log(`[smtp] relay listening on :${port} (STARTTLS)`));

  const tlsPort = process.env.SMTP_TLS_PORT ? Number(process.env.SMTP_TLS_PORT) : null;
  if (tlsPort && process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT) {
    new SMTPServer({ ...baseOptions(), secure: true }).listen(tlsPort, () => console.log(`[smtp] relay listening on :${tlsPort} (implicit TLS)`));
  }
}
