import type { Http } from "../http.js";
import type { Contact, CreateContactOptions, List, Segment, Topic, UpdateContactOptions } from "../types.js";

/** Contacts are team-wide; address them by id or email. */
export class Contacts {
  constructor(private http: Http) {}

  create(o: CreateContactOptions): Promise<Contact> {
    return this.http.request<Contact>("POST", "/v1/contacts", {
      email: o.email,
      first_name: o.firstName,
      last_name: o.lastName,
      unsubscribed: o.unsubscribed,
      properties: o.properties,
      segment_ids: o.segmentIds,
    });
  }

  get(idOrEmail: string): Promise<Contact> {
    return this.http.request<Contact>("GET", `/v1/contacts/${encodeURIComponent(idOrEmail)}`);
  }

  list(params: { limit?: number; after?: string; segmentId?: string; q?: string; unsubscribed?: boolean } = {}): Promise<List<Contact>> {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.after) q.set("after", params.after);
    if (params.segmentId) q.set("segment_id", params.segmentId);
    if (params.q) q.set("q", params.q);
    if (params.unsubscribed !== undefined) q.set("unsubscribed", String(params.unsubscribed));
    return this.http.request<List<Contact>>("GET", `/v1/contacts${q.size ? `?${q}` : ""}`);
  }

  update(idOrEmail: string, o: UpdateContactOptions): Promise<Contact> {
    return this.http.request<Contact>("PATCH", `/v1/contacts/${encodeURIComponent(idOrEmail)}`, {
      first_name: o.firstName,
      last_name: o.lastName,
      unsubscribed: o.unsubscribed,
      properties: o.properties,
      segment_ids: o.segmentIds,
      topics: o.topics?.map((t) => ({ topic_id: t.topicId, subscription: t.subscription })),
    });
  }

  remove(idOrEmail: string): Promise<{ id: string; deleted: true }> {
    return this.http.request("DELETE", `/v1/contacts/${encodeURIComponent(idOrEmail)}`);
  }
}

export class Segments {
  constructor(private http: Http) {}
  create(o: { name: string; description?: string }): Promise<Segment> {
    return this.http.request<Segment>("POST", "/v1/segments", o);
  }
  list(): Promise<List<Segment>> {
    return this.http.request<List<Segment>>("GET", "/v1/segments");
  }
  get(id: string): Promise<Segment> {
    return this.http.request<Segment>("GET", `/v1/segments/${id}`);
  }
  remove(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request("DELETE", `/v1/segments/${id}`);
  }
}

export class Topics {
  constructor(private http: Http) {}
  create(o: { name: string; description?: string; defaultSubscription?: "opt_in" | "opt_out"; visibility?: "public" | "private" }): Promise<Topic> {
    return this.http.request<Topic>("POST", "/v1/topics", { name: o.name, description: o.description, default_subscription: o.defaultSubscription, visibility: o.visibility });
  }
  list(): Promise<List<Topic>> {
    return this.http.request<List<Topic>>("GET", "/v1/topics");
  }
  update(id: string, o: { name?: string; description?: string; defaultSubscription?: "opt_in" | "opt_out"; visibility?: "public" | "private" }): Promise<Topic> {
    return this.http.request<Topic>("PATCH", `/v1/topics/${id}`, { name: o.name, description: o.description, default_subscription: o.defaultSubscription, visibility: o.visibility });
  }
  remove(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request("DELETE", `/v1/topics/${id}`);
  }
}

/** @deprecated Use `segments` + `contacts`. Kept for v0.1 compatibility. */
export class Audiences {
  constructor(private http: Http) {}
  create(options: { name: string }) {
    return this.http.request<{ id: string; name: string }>("POST", "/v1/audiences", { name: options.name });
  }
  list() {
    return this.http.request<{ data: { id: string; name: string; contact_count: number }[] }>("GET", "/v1/audiences");
  }
  addContact(audienceId: string, options: { email: string; firstName?: string; lastName?: string }) {
    return this.http.request<{ id: string; email: string }>("POST", `/v1/audiences/${audienceId}/contacts`, { email: options.email, first_name: options.firstName, last_name: options.lastName });
  }
  listContacts(audienceId: string) {
    return this.http.request<{ data: { id: string; email: string }[] }>("GET", `/v1/audiences/${audienceId}/contacts`);
  }
}
