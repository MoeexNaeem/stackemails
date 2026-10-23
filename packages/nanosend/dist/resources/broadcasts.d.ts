import type { Http } from "../http.js";
import type { Broadcast, CreateBroadcastOptions, List, SendBroadcastOptions } from "../types.js";
export declare class Broadcasts {
    private http;
    constructor(http: Http);
    /** Create a broadcast draft (or send/schedule it immediately with `send` / `scheduledAt`). */
    create(o: CreateBroadcastOptions): Promise<Broadcast>;
    /**
     * Send a draft by id, or (legacy v0.1) send immediately to an audience.
     */
    send(idOrLegacy: string | SendBroadcastOptions, opts?: {
        scheduledAt?: Date | string;
    }): Promise<Broadcast>;
    list(): Promise<List<Broadcast>>;
}
export declare class Events {
    private http;
    constructor(http: Http);
    /** Record a custom event for a contact; triggers matching automations. */
    send(o: {
        name: string;
        email: string;
        data?: Record<string, unknown>;
    }): Promise<{
        name: string;
        contact_id: string;
        emails_scheduled: number;
    }>;
}
