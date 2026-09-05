import { NanoSendError } from "./error.js";
import type { ClientOptions } from "./types.js";

export class Http {
  private apiKey: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(apiKey: string, options: ClientOptions = {}) {
    if (!apiKey) throw new Error("NanoSend: an API key is required.");
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.nanosend.dev").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("NanoSend: no global fetch found; pass `fetch` in options.");
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      const err = data?.error ?? {};
      throw new NanoSendError(
        res.status,
        err.code ?? "error",
        err.message ?? `Request failed with status ${res.status}`,
      );
    }
    return data as T;
  }
}
