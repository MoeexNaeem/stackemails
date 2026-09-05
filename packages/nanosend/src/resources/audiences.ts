import type { Http } from "../http.js";
import type { AddContactOptions, Audience, Contact } from "../types.js";

export class Audiences {
  constructor(private http: Http) {}

  /** Create an audience. */
  async create(options: { name: string }): Promise<Audience> {
    return this.http.request<Audience>("POST", "/v1/audiences", { name: options.name });
  }

  /** List audiences with contact counts. */
  async list(): Promise<{ data: Audience[] }> {
    return this.http.request<{ data: Audience[] }>("GET", "/v1/audiences");
  }

  /** Add a contact to an audience. */
  async addContact(audienceId: string, options: AddContactOptions): Promise<Contact> {
    return this.http.request<Contact>("POST", `/v1/audiences/${audienceId}/contacts`, {
      email: options.email,
      first_name: options.firstName,
      last_name: options.lastName,
    });
  }

  /** List contacts in an audience. */
  async listContacts(audienceId: string): Promise<{ data: Contact[] }> {
    return this.http.request<{ data: Contact[] }>(
      "GET",
      `/v1/audiences/${audienceId}/contacts`,
    );
  }
}
