import { env } from "@/lib/env";
import type {
  DomainIdentity,
  DomainVerificationStatus,
  EmailProvider,
  SendEmailParams,
  SendEmailResult,
} from "@/lib/email/types";

/**
 * Amazon SES (v2) provider. Only loaded when EMAIL_PROVIDER=ses. All AWS SDK
 * imports are dynamic so the mock path never pulls the SDK into the bundle.
 */
export class SesEmailProvider implements EmailProvider {
  readonly name = "ses";

  private async client(region?: string) {
    const { SESv2Client } = await import("@aws-sdk/client-sesv2");
    return new SESv2Client({
      region: region || env.aws.region,
      credentials:
        env.aws.accessKeyId && env.aws.secretAccessKey
          ? { accessKeyId: env.aws.accessKeyId, secretAccessKey: env.aws.secretAccessKey }
          : undefined, // fall back to the default AWS credential chain
    });
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");
    const client = await this.client();

    const body: Record<string, unknown> = {};
    if (params.html) body.Html = { Data: params.html, Charset: "UTF-8" };
    if (params.text) body.Text = { Data: params.text, Charset: "UTF-8" };

    const command = new SendEmailCommand({
      FromEmailAddress: params.from,
      Destination: {
        ToAddresses: params.to,
        CcAddresses: params.cc,
        BccAddresses: params.bcc,
      },
      ReplyToAddresses: params.replyTo,
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: body,
          Headers: params.headers?.length ? params.headers.map((h) => ({ Name: h.name, Value: h.value })) : undefined,
          Attachments: params.attachments?.length
            ? params.attachments.map((a) => ({
                FileName: a.filename,
                RawContent: new Uint8Array(a.content),
                ContentType: a.contentType || "application/octet-stream",
                ContentDisposition: "ATTACHMENT" as const,
                ContentTransferEncoding: "BASE64" as const,
              }))
            : undefined,
        },
      },
      // SES tag values allow only [A-Za-z0-9_-.]; sanitise caller tags.
      EmailTags: params.tags?.map((t) => ({ Name: t.name.replace(/[^\w.-]/g, "_").slice(0, 256), Value: t.value.replace(/[^\w.-]/g, "_").slice(0, 256) })),
      ConfigurationSetName: env.aws.configurationSet || undefined,
    });

    const res = await client.send(command);
    return { providerMessageId: res.MessageId ?? "" };
  }

  async createDomainIdentity(domain: string, region: string, opts?: { mailFrom?: string }): Promise<DomainIdentity> {
    const { CreateEmailIdentityCommand, PutEmailIdentityMailFromAttributesCommand } = await import("@aws-sdk/client-sesv2");
    const client = await this.client(region);
    const res = await client.send(
      new CreateEmailIdentityCommand({ EmailIdentity: domain, DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" } }),
    );
    // Custom MAIL FROM (send.<domain>) aligns SPF with the sending domain for DMARC.
    if (opts?.mailFrom) {
      await client
        .send(new PutEmailIdentityMailFromAttributesCommand({ EmailIdentity: domain, MailFromDomain: opts.mailFrom, BehaviorOnMxFailure: "USE_DEFAULT_VALUE" }))
        .catch((err) => console.warn(`[ses] could not set MAIL FROM for ${domain}:`, err?.message));
    }
    return {
      dkimTokens: res.DkimAttributes?.Tokens ?? [],
      arn: `arn:aws:ses:${region}:identity/${domain}`,
    };
  }

  async deleteDomainIdentity(domain: string, region: string): Promise<void> {
    const { DeleteEmailIdentityCommand } = await import("@aws-sdk/client-sesv2");
    const client = await this.client(region);
    await client.send(new DeleteEmailIdentityCommand({ EmailIdentity: domain })).catch((err) => {
      if (err?.name !== "NotFoundException") throw err;
    });
  }

  async getDomainStatus(domain: string, region: string): Promise<DomainVerificationStatus> {
    const { GetEmailIdentityCommand } = await import("@aws-sdk/client-sesv2");
    const client = await this.client(region);
    try {
      const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
      if (res.VerifiedForSendingStatus) return "verified";
      const dkim = res.DkimAttributes?.Status;
      if (dkim === "FAILED") return "failed";
      return "pending";
    } catch {
      return "failed";
    }
  }
}
