import type { Http } from "../http.js";
import type { CreateDomainOptions, Domain, List } from "../types.js";

export class Domains {
  constructor(private http: Http) {}

  /** Register a domain and receive the DNS records to publish. */
  create(options: CreateDomainOptions): Promise<Domain> {
    return this.http.request<Domain>("POST", "/v1/domains", {
      name: options.name,
      returnPath: options.returnPath,
      clickTracking: options.clickTracking,
      openTracking: options.openTracking,
    });
  }

  list(): Promise<List<Domain>> {
    return this.http.request<List<Domain>>("GET", "/v1/domains");
  }

  get(id: string): Promise<Domain> {
    return this.http.request<Domain>("GET", `/v1/domains/${id}`);
  }

  update(id: string, params: { openTracking?: boolean; clickTracking?: boolean; tls?: "opportunistic" | "enforced"; receiving?: boolean }): Promise<Domain> {
    return this.http.request<Domain>("PATCH", `/v1/domains/${id}`, {
      open_tracking: params.openTracking,
      click_tracking: params.clickTracking,
      tls: params.tls,
      receiving: params.receiving,
    });
  }

  /** Re-check DNS records and verification status. */
  verify(id: string): Promise<Domain> {
    return this.http.request<Domain>("POST", `/v1/domains/${id}/verify`);
  }

  remove(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request("DELETE", `/v1/domains/${id}`);
  }
}
