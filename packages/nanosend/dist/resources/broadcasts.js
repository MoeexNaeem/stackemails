export class Broadcasts {
    constructor(http) {
        this.http = http;
    }
    /** Create a broadcast draft (or send/schedule it immediately with `send` / `scheduledAt`). */
    create(o) {
        return this.http.request("POST", "/v1/broadcasts", {
            name: o.name,
            segment_id: o.segmentId,
            topic_id: o.topicId,
            from: o.from,
            reply_to: o.replyTo,
            subject: o.subject,
            preview_text: o.previewText,
            html: o.html,
            send: o.send,
            scheduled_at: o.scheduledAt ? new Date(o.scheduledAt).toISOString() : undefined,
        });
    }
    /**
     * Send a draft by id, or (legacy v0.1) send immediately to an audience.
     */
    send(idOrLegacy, opts = {}) {
        if (typeof idOrLegacy === "string") {
            return this.http.request("POST", `/v1/broadcasts/${idOrLegacy}/send`, opts.scheduledAt ? { scheduled_at: new Date(opts.scheduledAt).toISOString() } : undefined);
        }
        const o = idOrLegacy;
        return this.http.request("POST", "/v1/broadcasts", { audience_id: o.audienceId, from: o.from, subject: o.subject, html: o.html, send: true });
    }
    list() {
        return this.http.request("GET", "/v1/broadcasts");
    }
}
export class Events {
    constructor(http) {
        this.http = http;
    }
    /** Record a custom event for a contact; triggers matching automations. */
    send(o) {
        return this.http.request("POST", "/v1/events", o);
    }
}
