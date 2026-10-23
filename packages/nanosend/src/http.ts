import { StackEmailsError } from "./error.js";
import type { ClientOptions } from "./types.js";

export const VERSION = "0.2.0";

export class Http {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private maxRetries: number;

  constructor(apiKey: string, options: ClientOptions = {}) {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const key = apiKey || env?.STACKEMAILS_API_KEY;
    if (!key) throw new Error("Stack Emails: an API key is required (or set STACKEMAILS_API_KEY).");
    this.apiKey = key;
    this.baseUrl = (options.baseUrl ?? "https://stackemails.com").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.maxRetries = options.maxRetries ?? 2;
    if (!this.fetchImpl) {
      throw new Error("Stack Emails: no global fetch found; pass `fetch` in options.");
    }
  }

  /** JSON request with automatic retries on 429 / 5xx / network errors (exponential backoff). */
  async request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    let attempt = 0;
    for (;;) {
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "user-agent": `stackemails-node/${VERSION}`,
            ...(body !== undefined ? { "content-type": "application/json" } : {}),
            ...headers,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        if (attempt++ < this.maxRetries) {
          await sleep(backoff(attempt));
          continue;
        }
        throw new StackEmailsError(0, "network_error", err instanceof Error ? err.message : "Network error");
      }

      const text = await res.text();
      let data: unknown = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: { code: "invalid_response", message: text.slice(0, 200) } };
      }

      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt++ < this.maxRetries) {
          const after = Number(res.headers.get("retry-after"));
          await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : backoff(attempt));
          continue;
        }
        const err = (data as { error?: { code?: string; message?: string } })?.error ?? {};
        throw new StackEmailsError(res.status, err.code ?? "error", err.message ?? `Request failed with status ${res.status}`, res.headers.get("x-request-id") ?? undefined);
      }
      return data as T;
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(8000, 250 * 2 ** attempt) + Math.random() * 100;
