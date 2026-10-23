/** Contacts are team-wide; address them by id or email. */
export class Contacts {
    constructor(http) {
        this.http = http;
    }
    create(o) {
        return this.http.request("POST", "/v1/contacts", {
            email: o.email,
            first_name: o.firstName,
            last_name: o.lastName,
            unsubscribed: o.unsubscribed,
            properties: o.properties,
            segment_ids: o.segmentIds,
        });
    }
    get(idOrEmail) {
        return this.http.request("GET", `/v1/contacts/${encodeURIComponent(idOrEmail)}`);
    }
    list(params = {}) {
        const q = new URLSearchParams();
        if (params.limit)
            q.set("limit", String(params.limit));
        if (params.after)
            q.set("after", params.after);
        if (params.segmentId)
            q.set("segment_id", params.segmentId);
        if (params.q)
            q.set("q", params.q);
        if (params.unsubscribed !== undefined)
            q.set("unsubscribed", String(params.unsubscribed));
        return this.http.request("GET", `/v1/contacts${q.size ? `?${q}` : ""}`);
    }
    update(idOrEmail, o) {
        return this.http.request("PATCH", `/v1/contacts/${encodeURIComponent(idOrEmail)}`, {
            first_name: o.firstName,
            last_name: o.lastName,
            unsubscribed: o.unsubscribed,
            properties: o.properties,
            segment_ids: o.segmentIds,
            topics: o.topics?.map((t) => ({ topic_id: t.topicId, subscription: t.subscription })),
        });
    }
    remove(idOrEmail) {
        return this.http.request("DELETE", `/v1/contacts/${encodeURIComponent(idOrEmail)}`);
    }
}
export class Segments {
    constructor(http) {
        this.http = http;
    }
    create(o) {
        return this.http.request("POST", "/v1/segments", o);
    }
    list() {
        return this.http.request("GET", "/v1/segments");
    }
    get(id) {
        return this.http.request("GET", `/v1/segments/${id}`);
    }
    remove(id) {
        return this.http.request("DELETE", `/v1/segments/${id}`);
    }
}
export class Topics {
    constructor(http) {
        this.http = http;
    }
    create(o) {
        return this.http.request("POST", "/v1/topics", { name: o.name, description: o.description, default_subscription: o.defaultSubscription, visibility: o.visibility });
    }
    list() {
        return this.http.request("GET", "/v1/topics");
    }
    update(id, o) {
        return this.http.request("PATCH", `/v1/topics/${id}`, { name: o.name, description: o.description, default_subscription: o.defaultSubscription, visibility: o.visibility });
    }
    remove(id) {
        return this.http.request("DELETE", `/v1/topics/${id}`);
    }
}
/** @deprecated Use `segments` + `contacts`. Kept for v0.1 compatibility. */
export class Audiences {
    constructor(http) {
        this.http = http;
    }
    create(options) {
        return this.http.request("POST", "/v1/audiences", { name: options.name });
    }
    list() {
        return this.http.request("GET", "/v1/audiences");
    }
    addContact(audienceId, options) {
        return this.http.request("POST", `/v1/audiences/${audienceId}/contacts`, { email: options.email, first_name: options.firstName, last_name: options.lastName });
    }
    listContacts(audienceId) {
        return this.http.request("GET", `/v1/audiences/${audienceId}/contacts`);
    }
}
