import type { Http } from "../http.js";
import type { CreateDomainOptions, Domain } from "../types.js";
export declare class Domains {
    private http;
    constructor(http: Http);
    /** Register a domain and receive the DNS records to publish. */
    create(options: CreateDomainOptions): Promise<Domain>;
    /** List registered domains. */
    list(): Promise<{
        data: Domain[];
    }>;
    /** Re-check verification status with the provider. */
    verify(id: string): Promise<Domain>;
}
