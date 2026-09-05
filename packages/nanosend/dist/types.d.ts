import type { ReactElement } from "react";
export type EmailStatus = "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed";
/** Payload for `emails.send`. Provide `html`, `text`, and/or `react`. */
export interface SendEmailOptions {
    from: string;
    to: string | string[];
    subject: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string | string[];
    html?: string;
    text?: string;
    /** A React element (e.g. from React Email); rendered to HTML before sending. */
    react?: ReactElement;
    /** Optional idempotency key; identical keys never send twice. */
    idempotencyKey?: string;
}
export interface SendEmailResponse {
    id: string;
    status: EmailStatus;
}
export interface EmailEvent {
    type: string;
    at: string;
    detail?: string;
}
export interface Email {
    id: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    reply_to?: string[];
    subject: string;
    html?: string;
    text?: string;
    status: EmailStatus;
    error?: string | null;
    events: EmailEvent[];
    created_at: string;
    sent_at?: string | null;
    delivered_at?: string | null;
}
export interface EmailListItem {
    id: string;
    to: string[];
    from: string;
    subject: string;
    status: EmailStatus;
    created_at: string;
}
export interface DnsRecord {
    type: "TXT" | "CNAME" | "MX";
    name: string;
    value: string;
    purpose: string;
    status: "pending" | "verified" | "failed";
}
export interface Domain {
    id: string;
    name: string;
    status: "pending" | "verified" | "failed";
    region: string;
    records?: DnsRecord[];
    created_at?: string;
}
export interface CreateDomainOptions {
    name: string;
    region?: string;
}
export interface Audience {
    id: string;
    name: string;
    contact_count?: number;
    created_at?: string;
}
export interface Contact {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    unsubscribed?: boolean;
    created_at?: string;
}
export interface AddContactOptions {
    email: string;
    firstName?: string;
    lastName?: string;
}
export interface SendBroadcastOptions {
    audienceId: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
}
export interface SendBroadcastResponse {
    audience_id: string;
    queued: number;
    status: string;
}
export interface ClientOptions {
    /** Override the API base URL. Defaults to https://api.nanosend.dev. */
    baseUrl?: string;
    /** Custom fetch implementation (defaults to global fetch). */
    fetch?: typeof fetch;
}
