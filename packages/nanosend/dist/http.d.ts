import type { ClientOptions } from "./types.js";
export declare const VERSION = "0.2.0";
export declare class Http {
    private apiKey;
    private baseUrl;
    private fetchImpl;
    private maxRetries;
    constructor(apiKey: string, options?: ClientOptions);
    /** JSON request with automatic retries on 429 / 5xx / network errors (exponential backoff). */
    request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
}
