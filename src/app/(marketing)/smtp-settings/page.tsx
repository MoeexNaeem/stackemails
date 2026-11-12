import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { SMTP_PROVIDERS } from "@/content/pseo/smtp";

export const metadata: Metadata = pageMeta({
  title: "SMTP server addresses and settings for Gmail, Outlook and 30+ providers",
  description: "SMTP server addresses, ports and login rules for Gmail, Outlook, Office 365, Yahoo, iCloud, Zoho, GoDaddy, Rackspace, SendGrid, Amazon SES and 20+ more.",
  path: "/smtp-settings",
});

const KINDS = ["Mailbox", "Web host", "Email API"] as const;
const TITLES = { Mailbox: "Email providers", "Web host": "Web hosts and domain email", "Email API": "Email APIs and SMTP relays" };

export default function SmtpHub() {
  return (
    <PseoHub
      crumbs={[{ name: "SMTP settings", path: "/smtp-settings" }]}
      eyebrow="SMTP settings"
      title="SMTP server settings for every major provider"
      lead="The SMTP server address, ports, username and password rules for the providers people ask about most, checked against each provider's own help pages."
      path="/smtp-settings"
      description="SMTP server settings for Gmail, Outlook, Office 365, Yahoo and more."
      groups={KINDS.map((k) => ({
        title: TITLES[k],
        items: SMTP_PROVIDERS.filter((p) => p.kind === k).map((p) => ({ href: `/smtp-settings/${p.slug}`, title: `${p.name} SMTP settings`, text: `${p.host} · port ${p.ports.find((x) => x.recommended)?.port ?? p.ports[0].port}`, badge: p.kind })),
      }))}
      intro={`## Which port should you use?

Use **587 with STARTTLS** or **465 with implicit TLS** to submit mail. Port 25 is for server-to-server delivery and is blocked by most home ISPs and cloud providers. See [SMTP ports explained](/blog/smtp-ports-25-465-587-2525) for the details.

## Sending from an app or website?

Personal mailboxes have low daily limits and can't be authenticated for your own domain. For password resets, receipts and notifications, use a transactional email service. The [Stack Emails SMTP relay](/smtp-settings/stack-emails) works with any SMTP library and includes 3,000 free emails a month.`}
      faq={[
        { q: "What is an SMTP server?", a: "An SMTP server accepts outgoing email from mail apps and applications and delivers it to the recipient's mail server. You need its hostname, port and credentials to send email from an app, device or script." },
        { q: "What is the difference between SMTP, IMAP and POP3?", a: "SMTP sends mail. IMAP and POP3 read mail: IMAP keeps messages on the server and in sync across devices, while POP3 downloads them to one device." },
      ]}
    />
  );
}
