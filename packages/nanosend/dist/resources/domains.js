export class Domains {
    constructor(http) {
        this.http = http;
    }
    /** Register a domain and receive the DNS records to publish. */
    create(options) {
        return this.http.request("POST", "/v1/domains", {
            name: options.name,
            returnPath: options.returnPath,
            clickTracking: options.clickTracking,
            openTracking: options.openTracking,
        });
    }
    list() {
        return this.http.request("GET", "/v1/domains");
    }
    get(id) {
        return this.http.request("GET", `/v1/domains/${id}`);
    }
    update(id, params) {
        return this.http.request("PATCH", `/v1/domains/${id}`, {
            open_tracking: params.openTracking,
            click_tracking: params.clickTracking,
            tls: params.tls,
            receiving: params.receiving,
        });
    }
    /** Re-check DNS records and verification status. */
    verify(id) {
        return this.http.request("POST", `/v1/domains/${id}/verify`);
    }
    remove(id) {
        return this.http.request("DELETE", `/v1/domains/${id}`);
    }
}
