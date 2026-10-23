import type { Http } from "../http.js";
import type { CreateDomainOptions, Domain, List } from "../types.js";
export declare class Domains {
    private http;
    constructor(http: Http);
    /** Register a domain and receive the DNS records to publish. */
    create(options: CreateDomainOptions): Promise<Domain>;
    list(): Promise<List<Domain>>;
    get(id: string): Promise<Domain>;
    update(id: string, params: {
        openTracking?: boolean;
        clickTracking?: boolean;
        tls?: "opportunistic" | "enforced";
        receiving?: boolean;
    }): Promise<Domain>;
    /** Re-check DNS records and verification status. */
    verify(id: string): Promise<Domain>;
    remove(id: string): Promise<{
        id: string;
        deleted: true;
    }>;
}
