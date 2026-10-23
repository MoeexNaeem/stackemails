import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy policy",
  description: "How Stack Emails collects, uses and protects personal data — for our customers and for the recipients of email sent through our platform.",
  path: "/privacy",
});

const MD = `## Who we are

${site.name} ("we", "us") provides an email sending and receiving platform for businesses and developers at ${site.domain}. For questions about this policy, contact **${site.supportEmail}**.

This policy covers two kinds of personal data:

1. **Customer data** — information about people who create an account and use ${site.name}. We are the *controller* of this data.
2. **Recipient data** — email addresses, message content and engagement data our customers process through the platform. Our customers are the controllers; we act as their *processor* under our [Data Processing Addendum](/legal/dpa).

## Data we collect about customers

- **Account information:** name, email address, hashed password, team name, and optional two-factor authentication settings.
- **Billing information:** billing name, address, email and tax ID that you provide. We do not store payment card numbers.
- **Usage information:** API requests (including request and response bodies, kept for your logs), sign-in times and IP addresses, and actions taken in the dashboard.
- **Support communications:** messages you send us through support tickets or the contact form.

## How we use customer data

We use it to provide and secure the service, authenticate you, enforce plan limits, send service emails (such as password resets, receipts and security notices), respond to support requests, prevent abuse and fraud, and comply with legal obligations. Our legal bases are performance of a contract, legitimate interests (security, abuse prevention, product improvement) and legal obligation.

We do **not** sell personal data, and we do not use recipient data for our own marketing.

## Recipient data

When customers send email through ${site.name} we process the recipient's address, the message content, delivery events and — if the customer enables tracking — open and click events. We process this data only on our customers' documented instructions, to deliver email and provide analytics, suppression and webhooks to that customer.

Recipients who want to exercise their rights should contact the sender directly; we will assist our customers in responding.

## Sub-processors

We use a small number of service providers to run ${site.name}, listed on our [sub-processors page](/legal/subprocessors). Email delivery runs on Amazon Web Services (Amazon SES).

## Retention

- Email logs and analytics are kept for 30 days by default.
- Request logs are kept for 30 days.
- Suppression list entries are kept until removed by the customer, because they protect recipients from unwanted mail.
- Account data is kept while your account is active and deleted within 30 days of account deletion, except where we must keep records (for example invoices) by law.

## Security

We protect data with encryption in transit (TLS), hashed passwords, encrypted two-factor secrets, role-based access within teams, signed webhooks and the measures described on our [security page](/security).

## International transfers

Data may be processed in the European Union and the United States. Where data leaves the EEA, UK or Switzerland, we rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses.

## Your rights

Depending on where you live, you may have the right to access, correct, delete, restrict or port your personal data, and to object to certain processing. You can update most account information in the dashboard, and request anything else by emailing ${site.supportEmail}. You may also complain to your local data protection authority.

## Cookies

The marketing site does not use advertising or third-party analytics cookies. The dashboard uses strictly necessary cookies to keep you signed in, remember your selected team and protect against cross-site request forgery.

## Changes

We will post changes to this policy on this page and, for material changes, notify account owners by email.`;

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy policy" updated="October 23, 2026" markdown={MD} />;
}
