import type { Http } from "../http.js";
import type { Email, EmailListItem, SendEmailOptions, SendEmailResponse } from "../types.js";
export declare class Emails {
    private http;
    constructor(http: Http);
    /**
     * Send an email. Provide `html`, `text`, and/or a `react` element (rendered
     * to HTML via @react-email/render, which must be installed to use `react`).
     */
    send(options: SendEmailOptions): Promise<SendEmailResponse>;
    /** Retrieve a single email by id. */
    get(id: string): Promise<Email>;
    /** List recent emails. */
    list(params?: {
        limit?: number;
    }): Promise<{
        data: EmailListItem[];
    }>;
}
