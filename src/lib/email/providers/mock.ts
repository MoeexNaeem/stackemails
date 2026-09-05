import { randomBytes } from "node:crypto";
import type {
  DomainIdentity,
  DomainVerificationStatus,
  EmailProvider,
  SendEmailParams,
  SendEmailResult,
} from "@/lib/email/types";

/**
 * Mock provider — the default. No real emails are sent; it fabricates a
 * provider message id and logs the send. Domain identities are auto-"verified"
 * so the full flow is exercisable with zero AWS setup.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const id = `mock-${randomBytes(12).toString("hex")}`;
    console.log(
      `[mock-email] → ${params.to.join(", ")} | subject="${params.subject}" | id=${id}`,
    );
    return { providerMessageId: id };
  }

  async createDomainIdentity(domain: string): Promise<DomainIdentity> {
    // SES issues 3 CNAME DKIM tokens; fabricate deterministic-looking ones.
    const tokens = Array.from({ length: 3 }, () => randomBytes(16).toString("hex"));
    return { dkimTokens: tokens, arn: `arn:aws:ses:mock:000000000000:identity/${domain}` };
  }

  async getDomainStatus(): Promise<DomainVerificationStatus> {
    // In mock mode, a verification check always succeeds.
    return "verified";
  }
}
