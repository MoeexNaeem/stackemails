import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { ALTERNATIVES, VENDORS } from "@/content/pseo/alternatives";

export const metadata: Metadata = pageMeta({
  title: "Email API alternatives: SendGrid, Mailgun, Postmark, Resend and more",
  description: "Honest guides to the best alternatives for SendGrid, Mailgun, Postmark, Resend, Amazon SES, Mandrill, Brevo and Mailjet, with migration steps.",
  path: "/alternatives",
});

export default function AlternativesHub() {
  return (
    <PseoHub
      crumbs={[{ name: "Alternatives", path: "/alternatives" }]}
      eyebrow="Alternatives"
      title="Switching email providers?"
      lead="What each major email API is best at, the alternatives teams evaluate, and how to migrate without missing a message."
      path="/alternatives"
      description="Email API alternatives and migration guides."
      groups={[{ items: ALTERNATIVES.map((a) => ({ href: `/alternatives/${a.slug}`, title: `${VENDORS[a.vendor].name} alternatives`, text: a.lead.length > 130 ? `${a.lead.slice(0, 127).replace(/\s+\S*$/, "")}...` : a.lead })) }]}
      intro={`Want a side-by-side table instead? See our detailed [comparisons](/compare).`}
    />
  );
}
