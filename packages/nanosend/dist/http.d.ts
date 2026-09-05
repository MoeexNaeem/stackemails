import type { ClientOptions } from "./types.js";
export declare class Http {
    private apiKey;
    private baseUrl;
    private fetchImpl;
    constructor(apiKey: string, options?: ClientOptions);
    request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
}
