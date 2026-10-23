import type { ReactElement } from "react";

export type EmailStatus =
  | "queued"
  | "scheduled"
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "canceled";

export interface List<T> {
  object: "list";
  data: T[];
  has_more?: boolean;
}

export interface Attachment {
  filename: string;
  /** Base64 string, or a Buffer / Uint8Array (encoded for you). */
  content: string | Uint8Array;
  contentType?: string;
}

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
  headers?: Record<string, string>;
  attachments?: Attachment[];
  tags?: { name: string; value: string }[];
  /** Send later: a Date or ISO 8601 string, up to 30 days ahead. */
  scheduledAt?: Date | string;
  /** Identical keys never send twice (safe retries). */
  idempotencyKey?: string;
}

export interface SendEmailResponse {
  id: string;
  status: EmailStatus;
  scheduled_at?: string | null;
}

export interface EmailEvent {
  type: string;
  at: string;
  detail?: string | null;
}

export interface Email {
  object: "email";
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  status: EmailStatus;
  last_event: EmailStatus;
  error?: string | null;
  opens?: number;
  clicks?: number;
  events?: EmailEvent[];
  created_at: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
}

export interface DnsRecord {
  record: string;
  type: "TXT" | "CNAME" | "MX";
  name: string;
  value: string;
  status: "pending" | "verified" | "failed";
}

export interface Domain {
  object: "domain";
  id: string;
  name: string;
  status: "pending" | "verified" | "failed";
  region: string;
  records?: DnsRecord[];
  open_tracking?: boolean;
  click_tracking?: boolean;
  created_at?: string;
}

export interface CreateDomainOptions {
  name: string;
  /** Custom return-path subdomain (default "send"). */
  returnPath?: string;
  clickTracking?: boolean;
  openTracking?: boolean;
}

export interface Contact {
  object: "contact";
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  unsubscribed: boolean;
  properties: Record<string, unknown>;
  segment_ids: string[];
  topics: { topic_id: string; subscribed: boolean }[];
  created_at: string;
}

export interface CreateContactOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  properties?: Record<string, string | number | boolean | null>;
  segmentIds?: string[];
}

export interface UpdateContactOptions extends Partial<Omit<CreateContactOptions, "email">> {
  topics?: { topicId: string; subscription: "opt_in" | "opt_out" }[];
}

export interface Segment {
  object: "segment";
  id: string;
  name: string;
  description: string;
  contacts?: number;
  unsubscribed?: number;
  created_at: string;
}

export interface Topic {
  object: "topic";
  id: string;
  name: string;
  description: string;
  default_subscription: "opt_in" | "opt_out";
  visibility: "public" | "private";
  created_at: string;
}

export interface Broadcast {
  object: "broadcast";
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  segment_id: string | null;
  topic_id: string | null;
  from: string;
  subject: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  queued?: number;
  skipped?: number;
}

export interface CreateBroadcastOptions {
  segmentId: string;
  from: string;
  subject: string;
  html: string;
  name?: string;
  topicId?: string;
  replyTo?: string;
  previewText?: string;
  /** Send immediately after creating. */
  send?: boolean;
  scheduledAt?: Date | string;
}

/** Legacy (v0.1) broadcast payload. */
export interface SendBroadcastOptions {
  audienceId: string;
  from: string;
  subject: string;
  html: string;
}

export interface ClientOptions {
  /** Override the API base URL. Defaults to https://stackemails.com. */
  baseUrl?: string;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
  /** Retries for 429/5xx/network errors (default 2). */
  maxRetries?: number;
}

/** @deprecated Audiences are now Segments. */
export type Audience = Segment;
