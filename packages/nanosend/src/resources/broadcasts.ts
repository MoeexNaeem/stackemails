import type { Http } from "../http.js";
import type { Broadcast, CreateBroadcastOptions, List, SendBroadcastOptions } from "../types.js";

export class Broadcasts {
  constructor(private http: Http) {}

  /** Create a broadcast draft (or send/schedule it immediately with `send` / `scheduledAt`). */
  create(o: CreateBroadcastOptions): Promise<Broadcast> {
    return this.http.request<Broadcast>("POST", "/v1/broadcasts", {
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
  send(idOrLegacy: string | SendBroadcastOptions, opts: { scheduledAt?: Date | string } = {}): Promise<Broadcast> {
    if (typeof idOrLegacy === "string") {
      return this.http.request<Broadcast>("POST", `/v1/broadcasts/${idOrLegacy}/send`, opts.scheduledAt ? { scheduled_at: new Date(opts.scheduledAt).toISOString() } : undefined);
    }
    const o = idOrLegacy;
    return this.http.request<Broadcast>("POST", "/v1/broadcasts", { audience_id: o.audienceId, from: o.from, subject: o.subject, html: o.html, send: true });
  }

  list(): Promise<List<Broadcast>> {
    return this.http.request<List<Broadcast>>("GET", "/v1/broadcasts");
  }
}

export class Events {
  constructor(private http: Http) {}
  /** Record a custom event for a contact; triggers matching automations. */
  send(o: { name: string; email: string; data?: Record<string, unknown> }): Promise<{ name: string; contact_id: string; emails_scheduled: number }> {
    return this.http.request("POST", "/v1/events", o);
  }
}
