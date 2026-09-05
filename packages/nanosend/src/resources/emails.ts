import type { Http } from "../http.js";
import type {
  Email,
  EmailListItem,
  SendEmailOptions,
  SendEmailResponse,
} from "../types.js";

function asArray(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

export class Emails {
  constructor(private http: Http) {}

  /**
   * Send an email. Provide `html`, `text`, and/or a `react` element (rendered
   * to HTML via @react-email/render, which must be installed to use `react`).
   */
  async send(options: SendEmailOptions): Promise<SendEmailResponse> {
    let html = options.html;

    if (options.react) {
      html = await renderReact(options.react);
    }

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

    return this.http.request<SendEmailResponse>(
      "POST",
      "/v1/emails",
      {
        from: options.from,
        to: asArray(options.to),
        cc: asArray(options.cc),
        bcc: asArray(options.bcc),
        reply_to: asArray(options.replyTo),
        subject: options.subject,
        html,
        text: options.text,
      },
      headers,
    );
  }

  /** Retrieve a single email by id. */
  async get(id: string): Promise<Email> {
    return this.http.request<Email>("GET", `/v1/emails/${id}`);
  }

  /** List recent emails. */
  async list(params?: { limit?: number }): Promise<{ data: EmailListItem[] }> {
    const q = params?.limit ? `?limit=${params.limit}` : "";
    return this.http.request<{ data: EmailListItem[] }>("GET", `/v1/emails${q}`);
  }
}

async function renderReact(element: unknown): Promise<string> {
  try {
    const mod = await import("@react-email/render");
    return await mod.render(element as never);
  } catch {
    throw new Error(
      "NanoSend: `react` content requires the optional peer dependency " +
        "`@react-email/render`. Install it, or pass `html` instead.",
    );
  }
}
