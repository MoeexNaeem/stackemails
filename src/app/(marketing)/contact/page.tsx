import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/ContactForm";
import { absUrl, jsonLd, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Contact us: sales and support",
  description: "Talk to the Stack Emails team about pricing, high-volume sending, partnerships or technical support.",
  path: "/contact",
});

export default function ContactPage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absUrl("/contact"),
    mainEntity: { "@type": "Organization", "@id": absUrl("/#organization"), contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: site.supportEmail, availableLanguage: ["English"] }] },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <section className="m-container grid gap-14 pt-32 pb-24 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="m-eyebrow">Contact</p>
          <h1 className="m-display m-h1 mt-5 max-w-[12ch]">Let&apos;s <span className="m-highlight">talk.</span></h1>
          <p className="m-lead mt-6 max-w-[460px]">Questions about pricing, volume or migrating from another provider? Send us a note. A real person replies, usually within one business day.</p>
          <div className="mt-10 space-y-6">
            <div>
              <p className="font-semibold" style={{ color: "var(--m-head)" }}>Already a customer?</p>
              <p className="mt-1 text-[15px]" style={{ color: "var(--m-muted)" }}>Open a ticket from <Link href="/help" className="m-link">Help</Link> in your dashboard so we can see your account details.</p>
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--m-head)" }}>Email</p>
              <p className="mt-1 text-[15px]" style={{ color: "var(--m-muted)" }}><a href={`mailto:${site.supportEmail}`} className="m-link">{site.supportEmail}</a></p>
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--m-head)" }}>Documentation</p>
              <p className="mt-1 text-[15px]" style={{ color: "var(--m-muted)" }}>Most answers are in the <Link href="/docs" className="m-link">docs</Link>.</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
