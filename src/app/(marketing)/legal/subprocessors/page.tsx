import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = pageMeta({
  title: "Sub-processors",
  description: "Third-party service providers Stack Emails uses to process customer data.",
  path: "/legal/subprocessors",
});

const MD = `These are the third parties that process customer data on our behalf to provide Stack Emails.

| Sub-processor | Purpose | Location |
| --- | --- | --- |
| Amazon Web Services (Amazon SES, SNS) | Email sending, receiving and delivery events | EU (Stockholm) and US |
| MongoDB Atlas | Primary database | Cloud region of our deployment |
| Upstash | Queues and rate limiting (Redis) | Cloud region of our deployment |
| Anthropic | Optional in-dashboard AI assistant (only when you use it) | US |

We update this page at least 14 days before adding a new sub-processor that processes customer personal data. See our [DPA](/legal/dpa) for details.`;

export default function SubprocessorsPage() {
  return <LegalPage eyebrow="Legal" title="Sub-processors" updated="October 23, 2026" markdown={MD} />;
}
