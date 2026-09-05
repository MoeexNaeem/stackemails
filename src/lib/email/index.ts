import { env } from "@/lib/env";
import type { EmailProvider } from "@/lib/email/types";
import { MockEmailProvider } from "@/lib/email/providers/mock";
import { SesEmailProvider } from "@/lib/email/providers/ses";

let provider: EmailProvider | null = null;

/**
 * Singleton accessor for the configured email provider. The SES class is
 * imported statically but its heavy AWS SDK calls are dynamically imported
 * inside its methods, so the mock path pays no runtime cost.
 */
export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  provider = env.emailProvider === "ses" ? new SesEmailProvider() : new MockEmailProvider();
  return provider;
}

export * from "@/lib/email/types";
