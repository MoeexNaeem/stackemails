import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Acceptable use and anti-spam policy",
  description: "What you can and can't send with Stack Emails: verified domains, opt-in recipients only, automatic bounce and complaint suppression, zero tolerance for spam.",
  path: "/acceptable-use",
});

const MD = `## Our position on spam

${site.name} has zero tolerance for spam. Every email sent through our platform must go to someone who asked to receive it. This policy is part of our [terms of service](/terms) and applies to every account, on every plan.

## Who you can email

You may only send email to recipients who:

- gave you their address and agreed to hear from you (for marketing, through a clear opt-in), or
- have an existing relationship with you that the email relates to, such as a sign-up confirmation, password reset, receipt or account notice.

You must not use purchased, rented, shared, scraped or harvested lists, or send to addresses that have unsubscribed, bounced or complained.

## What you can't send

- Unsolicited bulk or commercial email
- Phishing, malware, or links to either
- Deceptive, fraudulent or misleading content, including fake sender names or subject lines
- Content that impersonates another person, brand or organisation
- Illegal content, or content that harasses, threatens or promotes violence
- Content that infringes someone else's intellectual property or privacy

## Requirements for marketing email

- Identify your business and include a valid physical postal address.
- Include a working unsubscribe link. ${site.name} adds one-click unsubscribe (RFC 8058) to every broadcast automatically, and you must not remove or hide it.
- Honour unsubscribe requests immediately.
- Follow the anti-spam laws that apply to you and your recipients, such as CAN-SPAM, CASL, GDPR and the ePrivacy rules.

## How we enforce it

These controls are built into the platform:

- **Verified domains only.** You can only send from domains you own and have verified with SPF and DKIM DNS records.
- **Automatic suppression.** Addresses that hard-bounce or mark your mail as spam are added to your suppression list and blocked from future sends.
- **Sending limits.** New and Free accounts have daily and monthly limits, and higher limits come only with a paid plan.
- **Monitoring.** We watch bounce and complaint rates for every account. Accounts that approach industry limits (around 4% bounces or 0.08% spam complaints) are reviewed and may have their sending paused.
- **Review and suspension.** We may pause, restrict or close accounts that break this policy, with notice where practical. Serious abuse, such as phishing, is suspended immediately.

## Reporting abuse

If you received unwanted email sent through ${site.name}, forward it with full headers to **${site.supportEmail}** with the subject "Abuse report". We investigate every report.`;

export default function AcceptableUsePage() {
  return <LegalPage eyebrow="Legal" title="Acceptable use policy" updated="November 5, 2026" markdown={MD} />;
}
