import type { Http } from "../http.js";
import type { CreateDomainOptions, Domain } from "../types.js";

export class Domains {
  constructor(private http: Http) {}

  /** Register a domain and receive the DNS records to publish. */
  async create(options: CreateDomainOptions): Promise<Domain> {
    return this.http.request<Domain>("POST", "/v1/domains", {
      name: options.name,
      region: options.region ?? "us-east-1",
    });
  }

  /** List registered domains. */
  async list(): Promise<{ data: Domain[] }> {
    return this.http.request<{ data: Domain[] }>("GET", "/v1/domains");
  }

  /** Re-check verification status with the provider. */
  async verify(id: string): Promise<Domain> {
    return this.http.request<Domain>("POST", `/v1/domains/${id}/verify`);
  }
}
