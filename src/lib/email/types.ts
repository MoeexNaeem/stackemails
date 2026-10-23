export interface EmailAttachment {
  filename: string;
  /** Raw bytes. */
  content: Buffer;
  contentType?: string;
}

export interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  html?: string;
  text?: string;
  /** Extra MIME headers (e.g. List-Unsubscribe). */
  headers?: { name: string; value: string }[];
  attachments?: EmailAttachment[];
  /** Provider tags (SES: mapped to EmailTags for SNS correlation). */
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  /** Provider-side message id (SES MessageId). */
  providerMessageId: string;
}

export interface DomainIdentity {
  dkimTokens: string[];
  arn?: string;
}

export type DomainVerificationStatus = "pending" | "verified" | "failed";

export interface EmailProvider {
  readonly name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
  createDomainIdentity(domain: string, region: string, opts?: { mailFrom?: string }): Promise<DomainIdentity>;
  deleteDomainIdentity?(domain: string, region: string): Promise<void>;
  getDomainStatus(domain: string, region: string): Promise<DomainVerificationStatus>;
}
