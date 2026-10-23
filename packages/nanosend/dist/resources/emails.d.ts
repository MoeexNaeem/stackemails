import type { Http } from "../http.js";
import type { Email, List, SendEmailOptions, SendEmailResponse } from "../types.js";
export declare class Emails {
    private http;
    constructor(http: Http);
    /** Send (or schedule) an email. */
    send(options: SendEmailOptions): Promise<SendEmailResponse>;
    /** Send up to 100 emails in one request (no attachments / scheduling). */
    batch(emails: SendEmailOptions[], opts?: {
        idempotencyKey?: string;
    }): Promise<{
        data: {
            id: string;
        }[];
        errors: {
            index: number;
            code: string;
            message: string;
        }[];
    }>;
    /** Retrieve a single email by id. */
    get(id: string): Promise<Email>;
    /** List emails, newest first. */
    list(params?: {
        limit?: number;
        after?: string;
        status?: string;
    }): Promise<List<Email>>;
    /** Reschedule a scheduled email. */
    update(id: string, params: {
        scheduledAt: Date | string;
    }): Promise<{
        id: string;
        scheduled_at: string;
    }>;
    /** Cancel a scheduled email before it sends. */
    cancel(id: string): Promise<{
        id: string;
        status: "canceled";
    }>;
}
