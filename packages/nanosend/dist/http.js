import { NanoSendError } from "./error.js";
export class Http {
    constructor(apiKey, options = {}) {
        if (!apiKey)
            throw new Error("NanoSend: an API key is required.");
        this.apiKey = apiKey;
        this.baseUrl = (options.baseUrl ?? "https://api.nanosend.dev").replace(/\/$/, "");
        this.fetchImpl = options.fetch ?? globalThis.fetch;
        if (!this.fetchImpl) {
            throw new Error("NanoSend: no global fetch found; pass `fetch` in options.");
        }
    }
    async request(method, path, body, headers = {}) {
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
            throw new NanoSendError(res.status, err.code ?? "error", err.message ?? `Request failed with status ${res.status}`);
        }
        return data;
    }
}
