import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Terms of service",
  description: "The terms that govern your use of the Stack Emails platform, API and website.",
  path: "/terms",
});

const MD = `## 1. Agreement

By creating an account or using the ${site.name} API, dashboard or website (the "Service"), you agree to these terms on behalf of yourself or the organisation you represent. If you don't agree, don't use the Service.

## 2. Your account

You must provide accurate information, keep your credentials and API keys secure, and are responsible for all activity under your account and teams. Tell us immediately at ${site.supportEmail} if you suspect unauthorised access.

## 3. Acceptable use

You may only send email to people who have agreed to receive it from you, and you must comply with applicable laws, including anti-spam laws (such as CAN-SPAM, CASL and the ePrivacy rules) and data protection laws. You must not:

- send unsolicited bulk email, or use purchased, rented or scraped lists;
- send phishing, malware, or deceptive or fraudulent content, or impersonate others;
- send content that is illegal, harassing or infringes others' rights;
- attempt to bypass sending limits, suppression lists, or security controls;
- probe, overload or disrupt the Service or other customers.

Marketing email must include a working unsubscribe mechanism. ${site.name} adds one-click unsubscribe to broadcasts automatically; you must not remove or obstruct it.

## 4. Deliverability and enforcement

To protect recipients and other customers, we monitor bounce and complaint rates. We may pause, restrict or suspend sending — with notice where practical — if your account's activity threatens the Service, breaches these terms, or exceeds the thresholds set by our infrastructure providers.

## 5. Plans, quotas and fees

Plans include the sending quotas and limits shown on our [pricing page](/pricing). Paid plans are billed monthly in advance. Fees are non-refundable except where required by law. We may change prices with at least 30 days' notice. Exceeding your quota results in sends being rejected, not in overage charges.

## 6. Your content and data

You keep all rights to the content and data you send through the Service. You grant us the limited rights needed to operate the Service. Our [Data Processing Addendum](/legal/dpa) applies to personal data we process on your behalf, and our [privacy policy](/privacy) describes how we handle account data.

## 7. Availability and changes

We work hard to keep the Service available but do not guarantee it will be uninterrupted or error-free. We may change or discontinue features; for material reductions in functionality on paid plans, we will give reasonable notice.

## 8. Termination

You may close your account at any time from the dashboard. We may suspend or terminate accounts that breach these terms. On termination your right to use the Service ends and we delete your data as described in the privacy policy.

## 9. Disclaimers

The Service is provided "as is". To the maximum extent permitted by law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose and non-infringement. We do not guarantee delivery to any particular inbox.

## 10. Limitation of liability

To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential or punitive damages, or lost profits or data. Our total liability for any claim is limited to the fees you paid us in the 12 months before the claim.

## 11. Indemnity

You will defend and indemnify us against claims arising from your content, your recipients' claims about email you sent, or your breach of these terms.

## 12. General

These terms are the entire agreement between us regarding the Service. If a provision is unenforceable, the rest remains in effect. We may update these terms; we'll notify account owners of material changes, and continued use after the effective date means you accept them.

Questions? Contact ${site.supportEmail}.`;

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of service" updated="October 23, 2026" markdown={MD} />;
}
