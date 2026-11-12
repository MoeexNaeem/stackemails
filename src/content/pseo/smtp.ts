/**
 * /smtp-settings/[slug]: outgoing (and incoming) mail server settings for
 * popular mailbox providers, hosts and email APIs. Values are taken from each
 * provider's public help pages; every page tells readers to confirm in the
 * provider's own docs because providers change auth rules over time.
 */
export type SmtpProvider = {
  slug: string;
  name: string;
  kind: "Mailbox" | "Web host" | "Email API";
  host: string;
  ports: { port: number; security: string; recommended?: boolean }[];
  username: string;
  password: string;
  /** Extra outgoing-server rows (alternate hosts, regions). */
  extra?: [string, string][];
  imap?: { host: string; port: number };
  pop?: { host: string; port: number };
  limits?: string;
  /** One-paragraph summary under the H1. */
  lead: string;
  /** Provider-specific Markdown (setup steps, gotchas). */
  notes: string;
  faq: { q: string; a: string }[];
  related: string[];
};

export const SMTP_REVIEWED = "2026-11-05";

const appPasswordSteps = (where: string) => `Most mail apps and code libraries need an **app password** rather than your normal password. ${where}`;

export const SMTP_PROVIDERS: SmtpProvider[] = [
  {
    slug: "gmail",
    name: "Gmail",
    kind: "Mailbox",
    host: "smtp.gmail.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full Gmail address (name@gmail.com)",
    password: "A 16-character app password",
    imap: { host: "imap.gmail.com", port: 993 },
    pop: { host: "pop.gmail.com", port: 995 },
    limits: "Personal Gmail accounts can send to about 500 recipients a day. Google may temporarily block sending if you exceed it.",
    lead: "The Gmail SMTP server is smtp.gmail.com on port 587 (STARTTLS) or 465 (SSL). Sign in with your full Gmail address and an app password, because Google no longer accepts your regular password from mail apps and scripts.",
    notes: `## How to create a Gmail app password

${appPasswordSteps("Google only shows the option once 2-Step Verification is on.")}

1. Turn on **2-Step Verification** at myaccount.google.com/security.
2. Open **App passwords** (search for it in your Google Account settings).
3. Enter a name such as "Website SMTP" and click **Create**.
4. Copy the 16-character password and use it as the SMTP password. Google shows it only once.

If your organisation uses Google Workspace, an admin may have disabled app passwords. See [Google Workspace SMTP settings](/smtp-settings/google-workspace) for the relay alternative.

## Gmail SMTP settings in code

\`\`\`js
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS upgrades the connection
  auth: { user: "you@gmail.com", pass: process.env.GMAIL_APP_PASSWORD },
});
\`\`\`

## When Gmail SMTP stops being enough

Gmail SMTP is fine for a contact form or a personal script. It is a poor fit for an application: the daily cap is low, mail is sent as your personal address, there are no delivery webhooks, and Google can lock the account if a script misbehaves. For product email (password resets, receipts, notifications), use a transactional email service with your own domain, such as the [Stack Emails SMTP relay](/docs/smtp) or [REST API](/docs/quickstart).`,
    faq: [
      { q: "What is the Gmail SMTP server address?", a: "smtp.gmail.com. Use port 587 with STARTTLS or port 465 with SSL/TLS, your full Gmail address as the username and an app password as the password." },
      { q: "Why does Gmail reject my password over SMTP?", a: "Google blocks regular account passwords for SMTP sign-in. Turn on 2-Step Verification, create an app password and use that instead, or use an app that signs in with OAuth." },
      { q: "How many emails can I send through Gmail SMTP?", a: "A personal Gmail account can send to roughly 500 recipients per day. Google Workspace accounts have higher limits. For bulk or application email, use a dedicated email service." },
      { q: "Which port should I use for Gmail SMTP, 587 or 465?", a: "Either works. 587 with STARTTLS is the modern default for mail submission; 465 uses TLS from the first byte and is useful when a library expects implicit TLS." },
    ],
    related: ["google-workspace", "outlook", "yahoo", "icloud"],
  },
  {
    slug: "google-workspace",
    name: "Google Workspace",
    kind: "Mailbox",
    host: "smtp.gmail.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full Workspace address (you@yourcompany.com)",
    password: "An app password, or sign in with OAuth",
    extra: [["SMTP relay host", "smtp-relay.gmail.com (ports 25, 465, 587)"]],
    imap: { host: "imap.gmail.com", port: 993 },
    limits: "Google documents a limit of 2,000 messages per user per day for paid Workspace accounts (lower during trials). The SMTP relay service has its own per-user and per-domain limits.",
    lead: "Google Workspace uses the same server as Gmail: smtp.gmail.com on port 587 (STARTTLS) or 465 (SSL), with your full work address and an app password. Admins can also set up the smtp-relay.gmail.com service for printers, apps and devices.",
    notes: `## Option 1: sign in as a user

Use \`smtp.gmail.com\` with your full work address and an app password. ${appPasswordSteps("Your admin must allow 2-Step Verification, and app passwords must not be blocked for your organisational unit.")}

## Option 2: the Workspace SMTP relay service

For devices and servers that send on behalf of many users, an admin can configure **Apps > Google Workspace > Gmail > Routing > SMTP relay service** in the Admin console. You choose whether the relay accepts mail only from specific IP addresses, only with SMTP authentication, or both, and whether TLS is required. Devices then send to \`smtp-relay.gmail.com\` on port 25, 465 or 587.

## Add SPF and DKIM for your domain

If you send from your own domain, publish Google's SPF include (\`include:_spf.google.com\`) and turn on DKIM signing in the Admin console. Check your records with our free [SPF checker](/tools/spf-checker) and [DKIM checker](/tools/dkim-checker) (Google's default selector is \`google\`).

## For application email

Workspace accounts are meant for people, not for your product's password resets and receipts. Sending application mail through a mailbox mixes it with staff mail, shares one reputation and hits per-user caps. A transactional email service such as [Stack Emails](/features/transactional-email) sends from a subdomain like \`mail.yourcompany.com\` with its own reputation, webhooks and logs.`,
    faq: [
      { q: "What is the SMTP server for Google Workspace?", a: "smtp.gmail.com on port 587 (STARTTLS) or 465 (SSL/TLS) when signing in as a user. The Workspace SMTP relay service uses smtp-relay.gmail.com and is configured by an admin." },
      { q: "Do I need an app password for Google Workspace SMTP?", a: "Yes, unless your app supports OAuth sign-in. App passwords require 2-Step Verification and can be disabled by your Workspace admin." },
      { q: "What is the Google Workspace sending limit?", a: "Google documents 2,000 messages per user per day for paid accounts, with lower limits during trials. Check Google's current sending limits page for details." },
    ],
    related: ["gmail", "office-365", "zoho"],
  },
  {
    slug: "outlook",
    name: "Outlook.com",
    kind: "Mailbox",
    host: "smtp-mail.outlook.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "Your full Outlook.com address",
    password: "Sign in with Microsoft (OAuth) in a supported app",
    imap: { host: "outlook.office365.com", port: 993 },
    pop: { host: "outlook.office365.com", port: 995 },
    limits: "Microsoft limits personal Outlook.com accounts to a few hundred messages per day and caps recipients per message; new accounts start lower.",
    lead: "The Outlook.com SMTP server is smtp-mail.outlook.com on port 587 with STARTTLS. Microsoft has retired basic (password) authentication for Outlook.com, so use a mail app that signs in with your Microsoft account through modern authentication.",
    notes: `## Modern authentication is now required

Microsoft has been switching Outlook.com, Hotmail and Live accounts from basic authentication (sending your password over IMAP, POP or SMTP) to **modern authentication (OAuth 2.0)**. Current versions of Outlook, Apple Mail, Thunderbird and most phone mail apps handle this automatically: you sign in through a Microsoft window instead of typing a password into the app.

Scripts and older devices that only support a username and password will fail with an authentication error. Options:

- Use a library that supports OAuth 2.0 for SMTP (XOAUTH2), registered as an app in Microsoft Entra ID.
- Send application email through a dedicated service instead. Printers, CMSs and scripts can use any SMTP relay that accepts an API key, such as the [Stack Emails SMTP relay](/docs/smtp).

## Hotmail and Live addresses

\`@hotmail.com\`, \`@live.com\` and \`@msn.com\` addresses are Outlook.com accounts and use exactly the same settings. See [Hotmail SMTP settings](/smtp-settings/hotmail).

## Work or school accounts

If your address is on your company's domain and hosted by Microsoft 365, use the [Office 365 SMTP settings](/smtp-settings/office-365) instead.`,
    faq: [
      { q: "What is the Outlook.com SMTP server?", a: "smtp-mail.outlook.com on port 587 with STARTTLS. Use your full Outlook.com address and sign in with modern authentication (OAuth)." },
      { q: "Why does my app say authentication failed for Outlook.com?", a: "Microsoft has retired basic authentication for Outlook.com, so apps that send your password directly are rejected. Use an app that supports Microsoft sign-in (OAuth 2.0), or send through an SMTP relay service." },
      { q: "What are the Outlook.com IMAP settings?", a: "outlook.office365.com on port 993 with SSL/TLS." },
    ],
    related: ["hotmail", "office-365", "gmail", "yahoo"],
  },
  {
    slug: "hotmail",
    name: "Hotmail",
    kind: "Mailbox",
    host: "smtp-mail.outlook.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "Your full Hotmail address (name@hotmail.com)",
    password: "Sign in with Microsoft (OAuth) in a supported app",
    imap: { host: "outlook.office365.com", port: 993 },
    pop: { host: "outlook.office365.com", port: 995 },
    lead: "Hotmail is part of Outlook.com, so the Hotmail SMTP server is smtp-mail.outlook.com on port 587 with STARTTLS. Your full Hotmail address is the username, and current apps sign in with Microsoft's modern authentication instead of a password.",
    notes: `## Hotmail, Live and MSN use Outlook.com servers

There is no separate Hotmail server any more. \`@hotmail.com\`, \`@live.com\` and \`@msn.com\` mailboxes all run on Outlook.com, so the [Outlook.com SMTP settings](/smtp-settings/outlook) apply.

## Fixing "authentication unsuccessful"

Microsoft has retired basic authentication (username and password) for these accounts. Remove the account from your mail app and add it again so the app shows Microsoft's sign-in window. Apps without OAuth 2.0 support can't send through Hotmail any more.

## Sending from a website or app

A personal Hotmail address isn't suitable for sending from a website: you can't authenticate it for your own domain and the daily limits are low. Use a transactional email service with your own domain instead, for example [Stack Emails](/smtp-settings/stack-emails).`,
    faq: [
      { q: "What is the Hotmail SMTP server?", a: "smtp-mail.outlook.com on port 587 with STARTTLS, the same as Outlook.com." },
      { q: "Is Hotmail SMTP the same as Outlook SMTP?", a: "Yes. Hotmail, Live and MSN addresses are Outlook.com accounts and use the same servers and sign-in rules." },
    ],
    related: ["outlook", "office-365", "yahoo"],
  },
  {
    slug: "office-365",
    name: "Microsoft 365 (Office 365)",
    kind: "Mailbox",
    host: "smtp.office365.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "The mailbox's full address (user@yourcompany.com)",
    password: "OAuth 2.0 (recommended) or the mailbox password where SMTP AUTH is allowed",
    extra: [["Direct send / relay", "yourdomain-com.mail.protection.outlook.com on port 25"]],
    imap: { host: "outlook.office365.com", port: 993 },
    pop: { host: "outlook.office365.com", port: 995 },
    limits: "Exchange Online limits each mailbox to 10,000 recipients per day and 30 messages per minute.",
    lead: "The Microsoft 365 (Office 365) SMTP server is smtp.office365.com on port 587 with STARTTLS. SMTP AUTH must be enabled for the mailbox, and Microsoft is moving SMTP sign-in to OAuth 2.0, so check your tenant's settings before relying on a password.",
    notes: `## Three ways to send through Microsoft 365

| Method | Server | Best for |
| --- | --- | --- |
| SMTP AUTH client submission | \`smtp.office365.com:587\` | Apps that sign in as one mailbox |
| Direct send | \`<your-domain>.mail.protection.outlook.com:25\` | Devices sending only to your own organisation |
| SMTP relay (connector) | \`<your-domain>.mail.protection.outlook.com:25\` | Devices with a static IP sending to anyone |

## Turn on SMTP AUTH for the mailbox

New tenants have SMTP AUTH turned off. An admin can enable it per mailbox in the Microsoft 365 admin center (**Users > Active users > Mail > Manage email apps > Authenticated SMTP**) as long as it isn't disabled tenant-wide and Security Defaults don't block it.

## Basic authentication is being retired

Microsoft has announced the retirement of basic authentication for SMTP AUTH client submission in Exchange Online. Plan for OAuth 2.0 (register an app in Microsoft Entra ID and request the \`SMTP.Send\` permission), or move application email to a dedicated sending service.

## For application email

Exchange Online is built for people's mailboxes, with per-mailbox caps of 10,000 recipients a day and 30 messages a minute. For password resets, receipts and notifications, a transactional email API such as [Stack Emails](/features/transactional-email) avoids those caps and gives you per-message delivery events.`,
    faq: [
      { q: "What is the Office 365 SMTP server?", a: "smtp.office365.com on port 587 with STARTTLS, signed in as the mailbox you send from." },
      { q: "Why is SMTP AUTH disabled in Office 365?", a: "Microsoft turns SMTP AUTH off by default for new tenants. An admin can enable it per mailbox unless it is disabled organisation-wide or blocked by Security Defaults." },
      { q: "What are the Office 365 sending limits?", a: "Exchange Online allows up to 10,000 recipients per mailbox per day and 30 messages per minute." },
      { q: "Can I use Office 365 SMTP without a password?", a: "Yes, through OAuth 2.0 with an app registered in Microsoft Entra ID, or through direct send / a connector-based relay on port 25." },
    ],
    related: ["outlook", "godaddy", "google-workspace"],
  },
  {
    slug: "yahoo",
    name: "Yahoo Mail",
    kind: "Mailbox",
    host: "smtp.mail.yahoo.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Yahoo address",
    password: "A Yahoo app password",
    imap: { host: "imap.mail.yahoo.com", port: 993 },
    pop: { host: "pop.mail.yahoo.com", port: 995 },
    lead: "The Yahoo Mail SMTP server is smtp.mail.yahoo.com on port 465 (SSL) or 587 (STARTTLS). Use your full Yahoo address and an app password generated in your Yahoo account security settings.",
    notes: `## Create a Yahoo app password

${appPasswordSteps("")}

1. Sign in at login.yahoo.com and open **Account security**.
2. Choose **Generate app password** (sometimes listed as "Manage app passwords").
3. Name it after the app or device and click **Generate**.
4. Use the generated password in your mail app or script.

## Yahoo's rules for bulk senders

Yahoo, like Gmail, requires bulk senders to authenticate with SPF, DKIM and DMARC, offer one-click unsubscribe and keep spam complaints low. See our guide to the [Gmail and Yahoo sender requirements](/blog/gmail-yahoo-bulk-sender-requirements).`,
    faq: [
      { q: "What is the Yahoo SMTP server?", a: "smtp.mail.yahoo.com on port 465 with SSL/TLS or port 587 with STARTTLS." },
      { q: "Why won't Yahoo accept my password in my email app?", a: "Third-party apps need a Yahoo app password. Generate one under Account security and use it instead of your normal password." },
    ],
    related: ["aol", "gmail", "outlook"],
  },
  {
    slug: "icloud",
    name: "iCloud Mail",
    kind: "Mailbox",
    host: "smtp.mail.me.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "Your full iCloud address (name@icloud.com)",
    password: "An app-specific password",
    imap: { host: "imap.mail.me.com", port: 993 },
    lead: "The iCloud Mail SMTP server is smtp.mail.me.com on port 587 with STARTTLS. Sign in with your full iCloud address and an app-specific password created at account.apple.com.",
    notes: `## Create an app-specific password

Apple requires two-factor authentication before you can create one.

1. Sign in at account.apple.com.
2. Open **Sign-In and Security > App-Specific Passwords**.
3. Create a password, give it a label, and use it as the SMTP password.

Use your full \`@icloud.com\` address as the username. If you only have \`@me.com\` or \`@mac.com\` addresses, Apple's help pages explain which name to use.

## Custom domains in iCloud+

iCloud+ lets you send from your own domain with the same server settings. Apple publishes the SPF, DKIM and MX records to add at your DNS provider; you can confirm them with our [MX lookup](/tools/mx-lookup) and [SPF checker](/tools/spf-checker).`,
    faq: [
      { q: "What is the iCloud SMTP server?", a: "smtp.mail.me.com on port 587 with STARTTLS, using your full iCloud address and an app-specific password." },
      { q: "Does iCloud Mail support port 465?", a: "Apple documents port 587 with STARTTLS for iCloud Mail. Use 587." },
    ],
    related: ["gmail", "yahoo", "fastmail"],
  },
  {
    slug: "zoho",
    name: "Zoho Mail",
    kind: "Mailbox",
    host: "smtp.zoho.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Zoho Mail address",
    password: "Your password, or an app-specific password if 2FA is on",
    extra: [["Business (custom domain) host", "smtppro.zoho.com"], ["Regional hosts", "smtp.zoho.eu, smtp.zoho.in, smtp.zoho.com.au"]],
    imap: { host: "imap.zoho.com", port: 993 },
    pop: { host: "pop.zoho.com", port: 995 },
    lead: "Zoho Mail's SMTP server is smtp.zoho.com for personal addresses and smtppro.zoho.com for business addresses on your own domain, on port 465 (SSL) or 587 (STARTTLS). Use the host for the region your account is in.",
    notes: `## Pick the right host

| Account | Host |
| --- | --- |
| Personal (@zohomail.com) | \`smtp.zoho.com\` |
| Organisation on your own domain | \`smtppro.zoho.com\` |
| EU / India / Australia data centres | \`smtp.zoho.eu\` / \`smtp.zoho.in\` / \`smtp.zoho.com.au\` (and \`smtppro.\` equivalents) |

If you get "authentication failed", check the region first: an EU account can't sign in through \`smtp.zoho.com\`.

## App-specific passwords

With two-factor authentication on, generate an **application-specific password** in Zoho Accounts under **Security** and use it in your mail app.

## Domain records

Zoho gives you SPF and DKIM records when you add a domain. Verify them with our [SPF checker](/tools/spf-checker) and [DKIM checker](/tools/dkim-checker).`,
    faq: [
      { q: "What is the Zoho SMTP server?", a: "smtp.zoho.com for personal accounts and smtppro.zoho.com for organisation accounts on a custom domain, on port 465 (SSL) or 587 (STARTTLS). EU, India and Australia accounts use the regional domain." },
      { q: "Why does Zoho SMTP authentication fail?", a: "The most common causes are using the wrong regional host, using smtp instead of smtppro for a business domain, or using your normal password while two-factor authentication is on." },
    ],
    related: ["google-workspace", "office-365", "fastmail"],
  },
  {
    slug: "aol",
    name: "AOL Mail",
    kind: "Mailbox",
    host: "smtp.aol.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full AOL address",
    password: "An AOL app password",
    imap: { host: "imap.aol.com", port: 993 },
    pop: { host: "pop.aol.com", port: 995 },
    lead: "The AOL Mail SMTP server is smtp.aol.com on port 465 (SSL) or 587 (STARTTLS). Use your full AOL address and an app password generated in your AOL account security settings.",
    notes: `## Generate an AOL app password

AOL accounts use the same security system as Yahoo. Open **Account security**, choose **Generate app password**, and use the result as your SMTP password. Your regular password won't work in third-party apps.

## Related providers

AOL and Yahoo share infrastructure; see the [Yahoo Mail SMTP settings](/smtp-settings/yahoo) for the equivalent steps.`,
    faq: [
      { q: "What is the AOL SMTP server?", a: "smtp.aol.com on port 465 with SSL/TLS or 587 with STARTTLS, using your full AOL address and an app password." },
    ],
    related: ["yahoo", "comcast", "att"],
  },
  {
    slug: "fastmail",
    name: "Fastmail",
    kind: "Mailbox",
    host: "smtp.fastmail.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Fastmail address",
    password: "A Fastmail app password",
    imap: { host: "imap.fastmail.com", port: 993 },
    lead: "The Fastmail SMTP server is smtp.fastmail.com on port 465 (SSL) or 587 (STARTTLS). Fastmail requires an app password for third-party apps, created under Settings > Privacy & Security.",
    notes: `## Create a Fastmail app password

1. Open **Settings > Privacy & Security > Manage app passwords and access**.
2. Click **New app password**, choose the access it needs (for sending, SMTP), and name it.
3. Use your Fastmail address as the username and the generated password.

Fastmail supports custom domains with automatic SPF and DKIM when you use its DNS, or records you copy to your own DNS provider.`,
    faq: [
      { q: "What is the Fastmail SMTP server?", a: "smtp.fastmail.com on port 465 with SSL/TLS or 587 with STARTTLS, using an app password." },
    ],
    related: ["icloud", "zoho", "proton"],
  },
  {
    slug: "proton",
    name: "Proton Mail",
    kind: "Mailbox",
    host: "smtp.protonmail.ch",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "A custom-domain address on a paid plan",
    password: "An SMTP token generated in Proton settings",
    extra: [["Proton Mail Bridge (desktop)", "127.0.0.1, port shown in Bridge (usually 1025)"]],
    lead: "Proton Mail doesn't offer standard SMTP with your account password. Paid plans can create SMTP tokens for custom-domain addresses and send through smtp.protonmail.ch on port 587, or use Proton Mail Bridge on a desktop computer.",
    notes: `## Option 1: SMTP submission with a token

On eligible paid plans, open **Settings > IMAP/SMTP > SMTP tokens**, generate a token for an address on your own domain, and use:

- Server \`smtp.protonmail.ch\`, port \`587\`, STARTTLS
- Username: the custom-domain address
- Password: the token

This is aimed at devices and apps that need to send mail, not at bulk sending.

## Option 2: Proton Mail Bridge

Bridge is a desktop app that decrypts and encrypts mail locally and exposes IMAP and SMTP on \`127.0.0.1\`. Desktop mail clients such as Thunderbird connect to it using the credentials Bridge shows.

## Sending from an application

Neither option suits a production web app. Use a transactional email service on your own domain, for example the [Stack Emails API](/docs/quickstart).`,
    faq: [
      { q: "Does Proton Mail support SMTP?", a: "Yes, in two ways: SMTP tokens for custom-domain addresses on paid plans (smtp.protonmail.ch, port 587, STARTTLS), and Proton Mail Bridge, a desktop app that exposes local IMAP and SMTP." },
    ],
    related: ["fastmail", "icloud", "gmail"],
  },
  {
    slug: "gmx",
    name: "GMX Mail",
    kind: "Mailbox",
    host: "mail.gmx.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full GMX address",
    password: "Your GMX password (enable POP3/IMAP access first)",
    extra: [["gmx.net / gmx.de accounts", "mail.gmx.net, port 587"]],
    imap: { host: "imap.gmx.com", port: 993 },
    lead: "The GMX SMTP server is mail.gmx.com for gmx.com addresses and mail.gmx.net for gmx.net and gmx.de addresses, on port 587 with STARTTLS. Turn on POP3/IMAP access in your GMX settings before connecting an email app.",
    notes: `## Enable external access first

GMX blocks third-party mail apps until you allow them: open **Settings > POP3 & IMAP** in GMX webmail and enable access. Then use the server for your domain:

| Address | SMTP server | IMAP server |
| --- | --- | --- |
| @gmx.com, @gmx.us | \`mail.gmx.com\` | \`imap.gmx.com\` |
| @gmx.net, @gmx.de, @gmx.at | \`mail.gmx.net\` | \`imap.gmx.net\` |`,
    faq: [
      { q: "What is the GMX SMTP server?", a: "mail.gmx.com for gmx.com addresses and mail.gmx.net for gmx.net or gmx.de addresses, on port 587 with STARTTLS." },
    ],
    related: ["gmail", "yahoo", "ionos"],
  },
  {
    slug: "comcast",
    name: "Comcast Xfinity",
    kind: "Mailbox",
    host: "smtp.comcast.net",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full Comcast email address",
    password: "Your Xfinity password",
    imap: { host: "imap.comcast.net", port: 993 },
    pop: { host: "mail.comcast.net", port: 995 },
    lead: "The Comcast (Xfinity) SMTP server is smtp.comcast.net on port 587 (STARTTLS) or 465 (SSL). Sign in with your full comcast.net address and your Xfinity password, and make sure third-party access is turned on in your Xfinity email settings.",
    notes: `## Turn on third-party access

In Xfinity Connect, open **Settings > Security** and allow third-party email apps. Without it, IMAP and SMTP sign-in is refused.

## Port 25 is blocked

Comcast blocks outbound port 25 on residential connections to stop spam from infected computers. Always submit mail on 587 or 465.`,
    faq: [
      { q: "What is the Comcast SMTP server?", a: "smtp.comcast.net on port 587 with STARTTLS or 465 with SSL/TLS, using your full Comcast email address." },
      { q: "Why can't I send on port 25 with Comcast?", a: "Comcast blocks port 25 on residential connections. Use port 587 or 465 for mail submission." },
    ],
    related: ["att", "aol", "earthlink"],
  },
  {
    slug: "att",
    name: "AT&T Mail",
    kind: "Mailbox",
    host: "outbound.att.net",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full AT&T email address",
    password: "A secure mail key",
    imap: { host: "imap.mail.att.net", port: 993 },
    pop: { host: "inbound.att.net", port: 995 },
    lead: "The AT&T Mail SMTP server is outbound.att.net on port 465 (SSL) or 587. Third-party apps need a secure mail key created in your AT&T profile instead of your regular password.",
    notes: `## Create a secure mail key

1. Sign in to your AT&T profile and open **Sign-in info**.
2. Under **Secure mail key**, choose **Manage secure mail key** and create one for the email address.
3. Use it as the password in your mail app.`,
    faq: [
      { q: "What is the AT&T SMTP server?", a: "outbound.att.net on port 465 with SSL/TLS (587 also works), using your full address and a secure mail key." },
    ],
    related: ["comcast", "yahoo", "aol"],
  },
  {
    slug: "godaddy",
    name: "GoDaddy Email",
    kind: "Web host",
    host: "smtp.office365.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }],
    username: "Your full email address",
    password: "Your email password (if SMTP AUTH is enabled)",
    extra: [["Workspace Email (legacy)", "smtpout.secureserver.net, port 465 (SSL)"]],
    imap: { host: "outlook.office365.com", port: 993 },
    lead: "Most GoDaddy email plans are Microsoft 365 from GoDaddy and use smtp.office365.com on port 587 with STARTTLS. Older GoDaddy Workspace Email accounts use smtpout.secureserver.net on port 465 with SSL.",
    notes: `## Which GoDaddy email do you have?

| Product | SMTP | IMAP |
| --- | --- | --- |
| Microsoft 365 from GoDaddy | \`smtp.office365.com:587\` (STARTTLS) | \`outlook.office365.com:993\` |
| Workspace Email (legacy) | \`smtpout.secureserver.net:465\` (SSL) | \`imap.secureserver.net:993\` |

If your webmail address is outlook.office.com, you have Microsoft 365. Microsoft 365 mailboxes also need **SMTP AUTH** turned on; GoDaddy's admin panel and Microsoft's admin center both have the switch. See the [Office 365 SMTP settings](/smtp-settings/office-365) for the full details.

## Sending from a WordPress site on GoDaddy

GoDaddy shared hosting restricts outgoing SMTP from websites. Instead of sending through your mailbox, use a WP SMTP plugin with a transactional email service, or call an email API over HTTPS, which isn't affected by SMTP port blocks.`,
    faq: [
      { q: "What is the GoDaddy SMTP server?", a: "For Microsoft 365 from GoDaddy: smtp.office365.com on port 587 (STARTTLS). For legacy Workspace Email: smtpout.secureserver.net on port 465 (SSL)." },
      { q: "Why does GoDaddy SMTP fail with authentication errors?", a: "Microsoft 365 mailboxes need SMTP AUTH enabled, and Microsoft is retiring basic authentication. Enable SMTP AUTH or use an app that signs in with OAuth." },
    ],
    related: ["office-365", "namecheap", "hostinger", "bluehost"],
  },
  {
    slug: "namecheap",
    name: "Namecheap Private Email",
    kind: "Web host",
    host: "mail.privateemail.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Private Email address",
    password: "Your mailbox password",
    imap: { host: "mail.privateemail.com", port: 993 },
    pop: { host: "mail.privateemail.com", port: 995 },
    lead: "Namecheap Private Email uses mail.privateemail.com for SMTP on port 465 (SSL) or 587 (STARTTLS), and the same host for IMAP on port 993. Sign in with your full email address and mailbox password.",
    notes: `## DNS records for Private Email

When Private Email is active on a domain using Namecheap's BasicDNS, Namecheap adds the MX and SPF records for you. On other DNS providers, add them yourself and confirm with our [MX lookup](/tools/mx-lookup) and [SPF checker](/tools/spf-checker).

## cPanel hosting email is different

Email that comes with Namecheap shared hosting (cPanel) uses your server's hostname, shown in cPanel under **Email Accounts > Connect Devices**.`,
    faq: [
      { q: "What is the Namecheap Private Email SMTP server?", a: "mail.privateemail.com on port 465 with SSL/TLS or 587 with STARTTLS." },
    ],
    related: ["godaddy", "hostinger", "bluehost"],
  },
  {
    slug: "hostinger",
    name: "Hostinger Email",
    kind: "Web host",
    host: "smtp.hostinger.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full email address",
    password: "Your mailbox password",
    imap: { host: "imap.hostinger.com", port: 993 },
    pop: { host: "pop.hostinger.com", port: 995 },
    lead: "The Hostinger SMTP server is smtp.hostinger.com on port 465 (SSL), with imap.hostinger.com on port 993 for incoming mail. Use your full email address and mailbox password.",
    notes: `## Sending from your website

For WordPress contact forms, set your SMTP plugin to \`smtp.hostinger.com\`, port 465, SSL, with the mailbox credentials. Hostinger mailboxes have hourly and daily sending limits, so newsletters and app notifications should go through a dedicated email service instead.`,
    faq: [
      { q: "What is the Hostinger SMTP server?", a: "smtp.hostinger.com on port 465 with SSL/TLS (587 with STARTTLS is also supported)." },
    ],
    related: ["namecheap", "godaddy", "bluehost", "titan"],
  },
  {
    slug: "bluehost",
    name: "Bluehost Email",
    kind: "Web host",
    host: "mail.yourdomain.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full email address",
    password: "Your mailbox password",
    imap: { host: "mail.yourdomain.com", port: 993 },
    pop: { host: "mail.yourdomain.com", port: 995 },
    lead: "Bluehost email uses your own domain as the server name: mail.yourdomain.com for SMTP on port 465 (SSL) and for IMAP on port 993. Replace yourdomain.com with your domain and sign in with the full email address.",
    notes: `## Find your exact settings

Bluehost shows the server names and ports in the account manager under **Email > Connect Devices**. If your domain's DNS isn't on Bluehost, \`mail.yourdomain.com\` may not resolve; use the server hostname shown there instead.

## Website email deliverability

Mail sent by PHP's \`mail()\` from shared hosting often lands in spam because it isn't authenticated for your domain. Point your contact forms at a transactional email service and add its SPF and DKIM records. Our [free SPF checker](/tools/spf-checker) shows whether your domain already authorises the right senders.`,
    faq: [
      { q: "What is the Bluehost SMTP server?", a: "mail.yourdomain.com (your own domain) on port 465 with SSL/TLS. The exact hostname is shown in Bluehost's Connect Devices page." },
    ],
    related: ["hostinger", "namecheap", "godaddy", "inmotion"],
  },
  {
    slug: "ionos",
    name: "IONOS (1&1) Mail",
    kind: "Web host",
    host: "smtp.ionos.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full email address",
    password: "Your mailbox password",
    extra: [["Germany / UK / other regions", "smtp.ionos.de, smtp.ionos.co.uk, ..."]],
    imap: { host: "imap.ionos.com", port: 993 },
    lead: "The IONOS SMTP server is smtp.ionos.com for US accounts on port 587 (STARTTLS) or 465 (SSL). Accounts in other countries use the local domain, such as smtp.ionos.de or smtp.ionos.co.uk.",
    notes: `## Use your country's server

IONOS runs separate mail domains per country. If sign-in fails, swap \`.com\` for your account's country domain (\`.de\`, \`.co.uk\`, \`.es\`, \`.fr\`, \`.it\`), for both SMTP and IMAP.`,
    faq: [
      { q: "What is the IONOS SMTP server?", a: "smtp.ionos.com for US accounts (smtp.ionos.de, smtp.ionos.co.uk and so on elsewhere), on port 587 with STARTTLS or 465 with SSL/TLS." },
    ],
    related: ["gmx", "godaddy", "hostinger"],
  },
  {
    slug: "earthlink",
    name: "EarthLink",
    kind: "Mailbox",
    host: "smtpauth.earthlink.net",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }],
    username: "Your full EarthLink address (name@earthlink.net)",
    password: "Your EarthLink password",
    imap: { host: "imap.earthlink.net", port: 993 },
    pop: { host: "pop.earthlink.net", port: 995 },
    lead: "The EarthLink SMTP server is smtpauth.earthlink.net on port 587 (STARTTLS) or 465 (SSL). Sign in with your full EarthLink email address and password; outgoing mail always requires authentication.",
    notes: `## Common problems

- **Authentication is required.** EarthLink only accepts outgoing mail from signed-in users, so turn on "My outgoing server requires authentication" in your mail app.
- **Use your full address** (including \`@earthlink.net\`) as the username.
- **Port 25 is blocked** by most home internet providers. Use 587 or 465.
- If sign-in keeps failing, check EarthLink's web mail settings for third-party (external) mail app access and its current help pages.`,
    faq: [
      { q: "What is the EarthLink SMTP server?", a: "smtpauth.earthlink.net on port 587 with STARTTLS or 465 with SSL/TLS, using your full EarthLink address and password." },
      { q: "What are EarthLink's IMAP settings?", a: "imap.earthlink.net on port 993 with SSL/TLS." },
    ],
    related: ["comcast", "att", "aol"],
  },
  {
    slug: "rackspace",
    name: "Rackspace Email",
    kind: "Web host",
    host: "secure.emailsrvr.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Rackspace email address",
    password: "Your mailbox password",
    imap: { host: "secure.emailsrvr.com", port: 993 },
    pop: { host: "secure.emailsrvr.com", port: 995 },
    lead: "The Rackspace Email SMTP server is secure.emailsrvr.com on port 465 (SSL) or 587 (STARTTLS). The same host handles IMAP on port 993 and POP3 on port 995; sign in with your full email address.",
    notes: `## One host for everything

Rackspace uses \`secure.emailsrvr.com\` for SMTP, IMAP and POP3, so you only need to remember one server name. Always use your **full email address** as the username.

## Sending from applications

Rackspace mailboxes have per-mailbox sending limits meant for people, not applications. For password resets, receipts and notifications, send through a transactional email service on your own domain, such as [Stack Emails](/smtp-settings/stack-emails), and keep Rackspace for staff mailboxes.`,
    faq: [
      { q: "What is the Rackspace SMTP server?", a: "secure.emailsrvr.com on port 465 with SSL/TLS or 587 with STARTTLS." },
      { q: "What is the Rackspace IMAP server?", a: "secure.emailsrvr.com on port 993 with SSL/TLS." },
    ],
    related: ["office-365", "google-workspace", "godaddy"],
  },
  {
    slug: "dreamhost",
    name: "DreamHost Email",
    kind: "Web host",
    host: "smtp.dreamhost.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full email address",
    password: "Your mailbox password",
    imap: { host: "imap.dreamhost.com", port: 993 },
    pop: { host: "pop.dreamhost.com", port: 995 },
    lead: "The DreamHost SMTP server is smtp.dreamhost.com on port 465 (SSL) or 587 (STARTTLS), with imap.dreamhost.com on port 993 for incoming mail. Sign in with your full email address and mailbox password.",
    notes: `## Sending from a DreamHost website

PHP's \`mail()\` on shared hosting isn't authenticated for your domain, so messages often land in spam. Point your contact forms and WordPress at an SMTP relay instead, and add its SPF and DKIM records. Our [WordPress guide](/send-email/wordpress) shows how.`,
    faq: [
      { q: "What is the DreamHost SMTP server?", a: "smtp.dreamhost.com on port 465 with SSL/TLS or 587 with STARTTLS." },
    ],
    related: ["bluehost", "hostinger", "inmotion"],
  },
  {
    slug: "inmotion",
    name: "InMotion Hosting Email",
    kind: "Web host",
    host: "mail.yourdomain.com (or your server's hostname)",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full email address",
    password: "Your mailbox password",
    imap: { host: "mail.yourdomain.com", port: 993 },
    pop: { host: "mail.yourdomain.com", port: 995 },
    lead: "InMotion Hosting email uses your own domain as the server: mail.yourdomain.com for SMTP on port 465 (SSL) or 587, and for IMAP on port 993. If the SSL certificate doesn't match, use your server's hostname shown in cPanel instead.",
    notes: `## Find your exact settings

In cPanel, open **Email Accounts**, then **Connect Devices** next to the mailbox. It lists the secure server hostname and ports for your account. Using the server hostname avoids certificate warnings when \`mail.yourdomain.com\` isn't covered by SSL.

## Sending from your website

For WordPress and contact forms, an authenticated SMTP relay with SPF and DKIM for your domain delivers far more reliably than PHP \`mail()\`. Check your records with the free [SPF checker](/tools/spf-checker).`,
    faq: [
      { q: "What is the InMotion Hosting SMTP server?", a: "mail.yourdomain.com (your own domain) or your server's hostname, on port 465 with SSL/TLS. cPanel's Connect Devices page shows the exact host." },
    ],
    related: ["bluehost", "hostinger", "dreamhost"],
  },
  {
    slug: "titan",
    name: "Titan Email",
    kind: "Web host",
    host: "smtp.titan.email",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "Your full Titan email address",
    password: "Your mailbox password",
    imap: { host: "imap.titan.email", port: 993 },
    pop: { host: "pop.titan.email", port: 995 },
    lead: "The Titan Email SMTP server is smtp.titan.email on port 465 (SSL) or 587 (STARTTLS), with imap.titan.email on port 993. Titan is the business email bundled with many hosts and domain registrars.",
    notes: `## Who uses Titan

Titan provides the mailboxes sold by several hosts and registrars (often labelled "Professional Email" or "Business Email"). If your provider's email login page is at titan.email, these are your settings.

## Domain records

Your provider usually adds Titan's MX, SPF and DKIM records for you. Confirm them with our [MX lookup](/tools/mx-lookup) and [SPF checker](/tools/spf-checker).`,
    faq: [
      { q: "What is the Titan Email SMTP server?", a: "smtp.titan.email on port 465 with SSL/TLS or 587 with STARTTLS, using your full email address." },
    ],
    related: ["hostinger", "namecheap", "godaddy"],
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    kind: "Email API",
    host: "smtp.sendgrid.net",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }, { port: 2525, security: "STARTTLS (alternate)" }, { port: 25, security: "STARTTLS" }],
    username: "apikey (literally the word apikey)",
    password: "A SendGrid API key with Mail Send permission",
    lead: "The SendGrid SMTP server is smtp.sendgrid.net on port 587 (STARTTLS), 465 (SSL) or 2525. The username is the literal word apikey and the password is a SendGrid API key with Mail Send access.",
    notes: `## Common mistakes

- **Username**: it is the word \`apikey\`, not your SendGrid login or email.
- **Key permissions**: the key needs at least **Mail Send** access.
- **Sender verification**: SendGrid only sends from a verified sender or an authenticated domain.

## Moving off SendGrid

If you're looking for a SendGrid alternative, most apps only need new SMTP credentials. With [Stack Emails](/smtp-settings/stack-emails) you change the host to \`smtp.stackemails.com\`, the username to \`stackemails\` and the password to an API key. See our [SendGrid alternatives](/alternatives/sendgrid) page and the [Stack Emails vs SendGrid](/compare/sendgrid) comparison.`,
    faq: [
      { q: "What is the SendGrid SMTP username?", a: "The literal string apikey. The password is your SendGrid API key." },
      { q: "Which ports does SendGrid SMTP support?", a: "25, 587 and 2525 with STARTTLS, and 465 with SSL/TLS." },
    ],
    related: ["mailgun", "amazon-ses", "postmark", "stack-emails"],
  },
  {
    slug: "mailgun",
    name: "Mailgun",
    kind: "Email API",
    host: "smtp.mailgun.org",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }, { port: 2525, security: "STARTTLS (alternate)" }, { port: 25, security: "STARTTLS" }],
    username: "Your domain's SMTP login (for example postmaster@mg.yourdomain.com)",
    password: "The SMTP password for that login",
    extra: [["EU region", "smtp.eu.mailgun.org"]],
    lead: "The Mailgun SMTP server is smtp.mailgun.org (smtp.eu.mailgun.org for EU accounts) on port 587, 465, 2525 or 25. Each sending domain has its own SMTP credentials, managed under the domain's settings in Mailgun.",
    notes: `## Find or create SMTP credentials

In Mailgun, open **Sending > Domain settings > SMTP credentials** for the domain you send from. The default login is \`postmaster@<your domain>\`; you can add more and reset passwords there.

## US vs EU

Domains created in Mailgun's EU region must use \`smtp.eu.mailgun.org\`. Using the US host with EU credentials returns an authentication error.

## Considering alternatives?

See our [Mailgun alternatives](/alternatives/mailgun) and the [Stack Emails vs Mailgun](/compare/mailgun) comparison.`,
    faq: [
      { q: "What is the Mailgun SMTP server?", a: "smtp.mailgun.org for US accounts and smtp.eu.mailgun.org for EU accounts, on ports 25, 587, 2525 (STARTTLS) or 465 (SSL/TLS)." },
    ],
    related: ["sendgrid", "amazon-ses", "postmark", "stack-emails"],
  },
  {
    slug: "amazon-ses",
    name: "Amazon SES",
    kind: "Email API",
    host: "email-smtp.<region>.amazonaws.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "TLS wrapper" }, { port: 2587, security: "STARTTLS (alternate)" }, { port: 2465, security: "TLS wrapper (alternate)" }, { port: 25, security: "STARTTLS" }],
    username: "An SES SMTP username (created in the SES console)",
    password: "The matching SES SMTP password",
    extra: [["Example (us-east-1)", "email-smtp.us-east-1.amazonaws.com"], ["Example (eu-west-1)", "email-smtp.eu-west-1.amazonaws.com"]],
    lead: "The Amazon SES SMTP endpoint is email-smtp.<region>.amazonaws.com, for example email-smtp.us-east-1.amazonaws.com, on port 587 or 2587 (STARTTLS) or 465 or 2465 (TLS). You need SES SMTP credentials created in the SES console; they are not the same as your AWS access keys.",
    notes: `## Create SMTP credentials

1. In the Amazon SES console, open **SMTP settings** for the region you send from.
2. Click **Create SMTP credentials**. This creates an IAM user with permission to send.
3. Save the SMTP username and password shown. The password is derived from a secret key and is region-specific.

## Sandbox limits

New SES accounts start in the **sandbox**: you can only send to verified addresses, with low daily quotas, until you request production access.

## Want SES deliverability without managing SES?

Stack Emails runs on Amazon SES and handles domain setup, suppression, webhooks, logs and an API on top. See [Stack Emails vs Amazon SES](/compare/amazon-ses).`,
    faq: [
      { q: "What is the Amazon SES SMTP server?", a: "email-smtp.<region>.amazonaws.com for the region your SES account sends from, for example email-smtp.us-east-1.amazonaws.com." },
      { q: "Can I use my AWS access key as the SES SMTP password?", a: "No. SES SMTP passwords are derived from a secret key and are region-specific. Create SMTP credentials in the SES console instead." },
    ],
    related: ["sendgrid", "mailgun", "postmark", "stack-emails"],
  },
  {
    slug: "postmark",
    name: "Postmark",
    kind: "Email API",
    host: "smtp.postmarkapp.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 2525, security: "STARTTLS (alternate)" }, { port: 25, security: "STARTTLS" }],
    username: "Your Server API token (or an SMTP token's access key)",
    password: "The same Server API token (or the SMTP token's secret key)",
    extra: [["Broadcast stream", "smtp-broadcasts.postmarkapp.com"]],
    lead: "The Postmark SMTP server is smtp.postmarkapp.com on port 587, 2525 or 25 with STARTTLS. Use a Server API token as both the username and password, or create an SMTP token for a specific message stream.",
    notes: `## Message streams

Postmark separates transactional and broadcast mail into message streams. Transactional mail uses \`smtp.postmarkapp.com\`; broadcast streams use \`smtp-broadcasts.postmarkapp.com\` and require an \`X-PM-Message-Stream\` header or SMTP token for that stream.

See [Postmark alternatives](/alternatives/postmark) and [Stack Emails vs Postmark](/compare/postmark).`,
    faq: [
      { q: "What is the Postmark SMTP server?", a: "smtp.postmarkapp.com on ports 25, 587 or 2525 with STARTTLS. Broadcast streams use smtp-broadcasts.postmarkapp.com." },
    ],
    related: ["sendgrid", "mailgun", "resend", "stack-emails"],
  },
  {
    slug: "brevo",
    name: "Brevo (Sendinblue)",
    kind: "Email API",
    host: "smtp-relay.brevo.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }, { port: 2525, security: "STARTTLS (alternate)" }],
    username: "Your SMTP login (shown under SMTP & API)",
    password: "An SMTP key",
    lead: "The Brevo (formerly Sendinblue) SMTP server is smtp-relay.brevo.com on port 587 with STARTTLS (465 and 2525 also work). Use the SMTP login and an SMTP key from Settings > SMTP & API; these differ from your Brevo account login.",
    notes: `## SMTP key vs API key

Brevo has two kinds of keys. SMTP relay needs an **SMTP key**, generated on the SMTP tab of **SMTP & API**. An API v3 key won't work as an SMTP password.`,
    faq: [
      { q: "What is the Brevo SMTP server?", a: "smtp-relay.brevo.com on port 587 with STARTTLS, using the SMTP login and SMTP key from Settings > SMTP & API." },
    ],
    related: ["mailjet", "sendgrid", "stack-emails"],
  },
  {
    slug: "mailjet",
    name: "Mailjet",
    kind: "Email API",
    host: "in-v3.mailjet.com",
    ports: [{ port: 587, security: "STARTTLS", recommended: true }, { port: 465, security: "SSL/TLS" }, { port: 25, security: "STARTTLS" }],
    username: "Your Mailjet API key",
    password: "Your Mailjet secret key",
    lead: "The Mailjet SMTP server is in-v3.mailjet.com on port 587 with STARTTLS (465 and 25 also work). The username is your API key and the password is the matching secret key.",
    notes: `## Find your keys

Open **Account settings > REST API > API Key Management**. The API key is the SMTP username and the secret key is the password. Senders must be verified addresses or domains.`,
    faq: [
      { q: "What is the Mailjet SMTP server?", a: "in-v3.mailjet.com on port 587 with STARTTLS, using your API key and secret key." },
    ],
    related: ["brevo", "mailgun", "stack-emails"],
  },
  {
    slug: "resend",
    name: "Resend",
    kind: "Email API",
    host: "smtp.resend.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }, { port: 2465, security: "SSL/TLS (alternate)" }, { port: 2587, security: "STARTTLS (alternate)" }],
    username: "resend",
    password: "A Resend API key",
    lead: "The Resend SMTP server is smtp.resend.com on port 465 (SSL) or 587 (STARTTLS), with 2465 and 2587 as alternates. The username is resend and the password is a Resend API key.",
    notes: `## Switching from Resend

Stack Emails follows the same conventions: host \`smtp.stackemails.com\`, username \`stackemails\`, password an API key. See [Resend alternatives](/alternatives/resend) and [Stack Emails vs Resend](/compare/resend).`,
    faq: [
      { q: "What is the Resend SMTP username?", a: "resend. The password is a Resend API key." },
    ],
    related: ["postmark", "sendgrid", "stack-emails"],
  },
  {
    slug: "stack-emails",
    name: "Stack Emails",
    kind: "Email API",
    host: "smtp.stackemails.com",
    ports: [{ port: 465, security: "SSL/TLS", recommended: true }, { port: 587, security: "STARTTLS" }],
    username: "stackemails",
    password: "A Stack Emails API key (se_live_...)",
    lead: "The Stack Emails SMTP relay is smtp.stackemails.com on port 465 (SSL) or 587 (STARTTLS). The username is stackemails and the password is an API key, ideally a sending-only key restricted to one domain.",
    notes: `## Why send through Stack Emails

SMTP mail goes through the same pipeline as the [REST API](/docs/quickstart): domain verification, suppression lists, quotas, request logs and [webhooks](/docs/webhooks) all apply, so you can see exactly what happened to every message. The free plan includes 3,000 emails a month.

## Setup in three steps

1. [Create a free account](/signup) and add your sending domain (we recommend a subdomain such as \`mail.yourcompany.com\`).
2. Add the DNS records shown. Check them anytime with our [SPF](/tools/spf-checker), [DKIM](/tools/dkim-checker) and [DMARC](/tools/dmarc-checker) checkers.
3. Create a sending-only API key and use it as the SMTP password.

## Example: Nodemailer

\`\`\`js
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: "smtp.stackemails.com",
  port: 465,
  secure: true,
  auth: { user: "stackemails", pass: process.env.STACKEMAILS_API_KEY },
});

await transport.sendMail({
  from: "Acme <hello@mail.acme.com>",
  to: "ada@example.com",
  subject: "Welcome to Acme",
  html: "<p>Thanks for signing up!</p>",
});
\`\`\`

More languages are in our [send email guides](/send-email).`,
    faq: [
      { q: "What is the Stack Emails SMTP server?", a: "smtp.stackemails.com on port 465 (SSL/TLS) or 587 (STARTTLS), username stackemails, password an API key." },
      { q: "Is the Stack Emails SMTP relay free?", a: "Yes. The free plan includes 3,000 emails a month (up to 100 a day) through the API or SMTP." },
    ],
    related: ["sendgrid", "resend", "postmark", "amazon-ses"],
  },
];

export const smtpBySlug = (slug: string) => SMTP_PROVIDERS.find((p) => p.slug === slug);
