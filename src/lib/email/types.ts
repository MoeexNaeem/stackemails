export interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  html?: string;
  text?: string;
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
  createDomainIdentity(domain: string, region: string): Promise<DomainIdentity>;
  getDomainStatus(domain: string, region: string): Promise<DomainVerificationStatus>;
}
