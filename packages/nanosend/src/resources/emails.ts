import type { Http } from "../http.js";
import type { Attachment, Email, List, SendEmailOptions, SendEmailResponse } from "../types.js";

function asArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

function toBase64(content: string | Uint8Array): string {
  if (typeof content === "string") return content;
  const B = (globalThis as { Buffer?: { from(u: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(content).toString("base64");
  let bin = "";
  content.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function payload(o: SendEmailOptions) {
  return {
    from: o.from,
    to: asArray(o.to),
    cc: asArray(o.cc),
    bcc: asArray(o.bcc),
    reply_to: asArray(o.replyTo),
    subject: o.subject,
    html: o.react ? await renderReact(o.react) : o.html,
    text: o.text,
    headers: o.headers,
    tags: o.tags,
    attachments: o.attachments?.map((a: Attachment) => ({ filename: a.filename, content: toBase64(a.content), content_type: a.contentType })),
    scheduled_at: o.scheduledAt ? new Date(o.scheduledAt).toISOString() : undefined,
  };
}

export class Emails {
  constructor(private http: Http) {}

  /** Send (or schedule) an email. */
  async send(options: SendEmailOptions): Promise<SendEmailResponse> {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
    return this.http.request<SendEmailResponse>("POST", "/v1/emails", await payload(options), headers);
  }

  /** Send up to 100 emails in one request (no attachments / scheduling). */
  async batch(emails: SendEmailOptions[], opts: { idempotencyKey?: string } = {}): Promise<{ data: { id: string }[]; errors: { index: number; code: string; message: string }[] }> {
    const headers: Record<string, string> = {};
    if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
    return this.http.request("POST", "/v1/emails/batch", await Promise.all(emails.map(payload)), headers);
  }

  /** Retrieve a single email by id. */
  async get(id: string): Promise<Email> {
    return this.http.request<Email>("GET", `/v1/emails/${encodeURIComponent(id)}`);
  }

  /** List emails, newest first. */
  async list(params: { limit?: number; after?: string; status?: string } = {}): Promise<List<Email>> {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return this.http.request<List<Email>>("GET", `/v1/emails${q.size ? `?${q}` : ""}`);
  }

  /** Reschedule a scheduled email. */
  async update(id: string, params: { scheduledAt: Date | string }): Promise<{ id: string; scheduled_at: string }> {
    return this.http.request("PATCH", `/v1/emails/${encodeURIComponent(id)}`, { scheduled_at: new Date(params.scheduledAt).toISOString() });
  }

  /** Cancel a scheduled email before it sends. */
  async cancel(id: string): Promise<{ id: string; status: "canceled" }> {
    return this.http.request("POST", `/v1/emails/${encodeURIComponent(id)}/cancel`);
  }
}

async function renderReact(element: unknown): Promise<string> {
  try {
    const mod = await import("@react-email/render");
    return await mod.render(element as never);
  } catch {
    throw new Error("Stack Emails: `react` content requires the optional peer dependency `@react-email/render`. Install it, or pass `html` instead.");
  }
}
