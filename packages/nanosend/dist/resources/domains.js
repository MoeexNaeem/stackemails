export class Domains {
    constructor(http) {
        this.http = http;
    }
    /** Register a domain and receive the DNS records to publish. */
    async create(options) {
        return this.http.request("POST", "/v1/domains", {
            name: options.name,
            region: options.region ?? "us-east-1",
        });
    }
    /** List registered domains. */
    async list() {
        return this.http.request("GET", "/v1/domains");
    }
    /** Re-check verification status with the provider. */
    async verify(id) {
        return this.http.request("POST", `/v1/domains/${id}/verify`);
    }
}
