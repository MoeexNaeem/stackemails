import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Data processing addendum (DPA)",
  description: "The Stack Emails data processing addendum: how we process personal data on behalf of our customers under GDPR and UK GDPR.",
  path: "/legal/dpa",
});

const MD = `This Data Processing Addendum ("DPA") forms part of the [Terms of service](/terms) between ${site.name} ("Processor") and the customer ("Controller"). It applies whenever we process personal data on the customer's behalf.

## 1. Scope and roles

The customer is the controller of personal data contained in emails, contacts and events it submits ("Customer Personal Data"). ${site.name} processes it only as a processor, to provide the Service.

## 2. Details of processing

| | |
| --- | --- |
| **Subject matter** | Sending, receiving and tracking email; storing contacts |
| **Duration** | For the term of the agreement, plus the retention periods in our privacy policy |
| **Categories of data subjects** | Recipients and senders of email; customer's contacts |
| **Types of data** | Email addresses, names, message content, contact properties, IP address and user agent for opens and clicks |
| **Sensitive data** | Not intended; the customer must not send special-category data unless lawfully permitted |

## 3. Processor obligations

We will:

- process Customer Personal Data only on documented instructions from the customer, including those in the Terms and the customer's use of the Service;
- ensure personnel with access are bound by confidentiality;
- implement appropriate technical and organisational measures (see [Security](/security));
- assist the customer, taking into account the nature of processing, with data subject requests and with security, breach-notification and impact-assessment obligations;
- notify the customer without undue delay after becoming aware of a personal data breach;
- delete or return Customer Personal Data at the end of the agreement, unless retention is required by law;
- make available information necessary to demonstrate compliance with this DPA.

## 4. Sub-processors

The customer authorises the sub-processors listed on our [sub-processors page](/legal/subprocessors). We will give notice of new sub-processors by updating that page at least 14 days in advance, and the customer may object on reasonable data-protection grounds. We remain responsible for our sub-processors' performance.

## 5. International transfers

Where Customer Personal Data is transferred outside the EEA, UK or Switzerland to a country without an adequacy decision, the parties agree to the European Commission's Standard Contractual Clauses (Module 2 or 3 as applicable) and the UK International Data Transfer Addendum, which are incorporated by reference.

## 6. Customer obligations

The customer is responsible for having a lawful basis and any required consent to send email to its recipients, and for the accuracy of its instructions.

## 7. Contact

To request a countersigned copy of this DPA, email ${site.supportEmail}.`;

export default function DpaPage() {
  return <LegalPage eyebrow="Legal" title="Data processing addendum" updated="October 23, 2026" markdown={MD} />;
}
