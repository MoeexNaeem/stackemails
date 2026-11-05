import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Refund policy",
  description: "How cancellations and refunds work for Stack Emails subscriptions: cancel anytime, and request a full refund within 14 days of any charge.",
  path: "/refund",
});

const MD = `## Summary

- You can cancel your subscription at any time.
- If you're not happy, ask for a refund within **14 days** of any charge and we'll refund that charge in full.
- The Free plan never charges you, so there is nothing to refund.

## What we sell

${site.name} sells monthly software subscriptions (Pro and Scale plans) that give your team access to our email API and dashboard with higher sending limits. Plans are billed monthly in advance and renew automatically until you cancel. Prices are shown on our [pricing page](/pricing).

## Cancelling

You can cancel or downgrade to the Free plan at any time from **Settings > Billing** in the dashboard, or by emailing ${site.supportEmail}. When you cancel:

- no further renewals are charged;
- your paid plan stays active until the end of the period you've already paid for;
- your account, domains and data stay on the Free plan unless you delete them.

## Refunds

**14-day refund window.** You can request a full refund of any subscription charge (your first payment or a renewal) within 14 days of the date you were charged. We don't ask you to give a reason. When we refund a charge, the account moves back to the Free plan.

**After 14 days.** Charges older than 14 days are not refundable, and we don't give partial refunds for unused time in a billing period. You can still cancel so the next renewal isn't charged.

**Plan changes.** If you upgrade partway through a period, the new price applies from the date of the upgrade. If you downgrade, the change takes effect at the end of the current period.

**Duplicate or mistaken charges.** If you were charged twice or charged after cancelling, tell us and we'll refund the incorrect charge in full, whenever you notice it.

**Accounts closed for abuse.** If we suspend an account for sending spam, phishing or other content that breaks our [acceptable use policy](/acceptable-use), charges for the period in which the abuse happened are not refunded. This does not affect any rights you have under consumer law.

## How to request a refund

Email **${site.supportEmail}** from the address on your account with the subject "Refund request", and include your team name and the date of the charge. We reply within 2 business days. Approved refunds go back to your original payment method, and most banks show them within 5 to 10 business days.

## Your legal rights

This policy is in addition to, and doesn't limit, any rights you have under the consumer protection laws of your country.

Questions? Contact ${site.supportEmail}.`;

export default function RefundPage() {
  return <LegalPage eyebrow="Legal" title="Refund policy" updated="November 5, 2026" markdown={MD} />;
}
