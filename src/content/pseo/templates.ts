/**
 * /email-templates/[slug]: free transactional email templates with subject
 * lines, copy and production-ready, table-based HTML that renders in Outlook,
 * Gmail and Apple Mail. HTML is generated from a small builder so every
 * template shares the same tested layout.
 */
export type EmailTemplate = {
  slug: string;
  name: string;
  keyword: string; // e.g. "password reset email template"
  description: string;
  subjects: string[];
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; href: string };
  code?: string;
  table?: [string, string][];
  footnote: string;
  variables: string[];
  tips: string[];
  related: string[];
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bulletproof, table-based HTML that works in Outlook desktop, Gmail and Apple Mail. */
export function templateHtml(t: EmailTemplate): string {
  const p = (text: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#3f3f46;">${esc(text)}</p>`;
  const button = t.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:8px;background:#18181b;"><a href="${t.button.href}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(t.button.label)}</a></td></tr></table>`
    : "";
  const code = t.code
    ? `<p style="margin:8px 0 24px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;letter-spacing:8px;font-weight:700;color:#18181b;">${esc(t.code)}</p>`
    : "";
  const table = t.table
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;border-top:1px solid #e4e4e7;">${t.table
        .map(([k, v], i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#71717a;">${esc(k)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;${i === t.table!.length - 1 ? "font-weight:700;" : ""}">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(t.subjects[0])}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(t.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:32px 32px 0;font-size:18px;font-weight:700;color:#18181b;">Acme</td></tr>
<tr><td style="padding:24px 32px 8px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:#18181b;">${esc(t.heading)}</h1>
${t.paragraphs.slice(0, 1).map(p).join("\n")}
${code}${button}${table}
${t.paragraphs.slice(1).map(p).join("\n")}
</td></tr>
<tr><td style="padding:16px 32px 32px;border-top:1px solid #f4f4f5;font-size:13px;line-height:20px;color:#a1a1aa;">${esc(t.footnote)}<br>Acme Inc., 123 Market St, San Francisco, CA</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function templateText(t: EmailTemplate): string {
  return [
    t.heading,
    "",
    t.paragraphs[0],
    t.code ? `\n${t.code}\n` : "",
    t.button ? `${t.button.label}: ${t.button.href}\n` : "",
    t.table ? t.table.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n" : "",
    ...t.paragraphs.slice(1),
    "",
    "-- ",
    t.footnote,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();
}

export const TEMPLATES: EmailTemplate[] = [
  {
    slug: "password-reset",
    name: "Password reset",
    keyword: "password reset email template",
    description: "A free password reset email template with subject lines, copy and responsive HTML that works in Gmail, Outlook and Apple Mail.",
    subjects: ["Reset your Acme password", "Your password reset link", "Did you ask to reset your password?"],
    preheader: "This link expires in 60 minutes.",
    heading: "Reset your password",
    paragraphs: [
      "We received a request to reset the password for your Acme account. Click the button below to choose a new one. This link expires in 60 minutes.",
      "If you didn't ask to reset your password, you can ignore this email. Your password won't change.",
    ],
    button: { label: "Reset password", href: "https://acme.com/reset?token={{token}}" },
    footnote: "You're receiving this because a password reset was requested for your account.",
    variables: ["{{token}}", "{{first_name}}"],
    tips: ["Make the link single-use and expire it within an hour.", "Never include the user's current or new password in the email.", "Send it immediately: password resets should be the first thing on a dedicated transactional subdomain.", "Show the same response whether or not the email exists, so the form can't be used to check for accounts."],
    related: ["email-verification", "magic-link", "new-login-alert"],
  },
  {
    slug: "welcome",
    name: "Welcome",
    keyword: "welcome email template",
    description: "A free welcome email template for SaaS and apps, with subject lines, a single clear call to action and responsive HTML.",
    subjects: ["Welcome to Acme, {{first_name}}", "You're in! Here's how to get started", "Welcome aboard"],
    preheader: "Three steps to get the most out of Acme.",
    heading: "Welcome to Acme, {{first_name}}",
    paragraphs: [
      "Thanks for signing up. Your account is ready, and it takes about five minutes to get set up.",
      "Reply to this email if you have any questions. A real person reads every reply.",
    ],
    button: { label: "Finish setting up", href: "https://acme.com/onboarding" },
    footnote: "You're receiving this because you created an Acme account.",
    variables: ["{{first_name}}"],
    tips: ["Send it within seconds of sign-up, while the user is still engaged.", "Pick one call to action: the first step that gets users to value.", "Use a reply-to address someone monitors; replies help your sender reputation.", "Keep marketing content for a later, opt-in onboarding sequence."],
    related: ["email-verification", "team-invitation", "trial-ending"],
  },
  {
    slug: "email-verification",
    name: "Email verification",
    keyword: "verification email template",
    description: "A free email verification (confirm your email) template with subject lines, copy and HTML, for sign-up and email-change flows.",
    subjects: ["Confirm your email address", "Verify your email to finish signing up", "One more step: confirm your email"],
    preheader: "Confirm your address to activate your account.",
    heading: "Confirm your email address",
    paragraphs: [
      "Please confirm that {{email}} is your email address so we can finish setting up your Acme account.",
      "If you didn't create an account, you can safely ignore this email.",
    ],
    button: { label: "Confirm email", href: "https://acme.com/verify?token={{token}}" },
    footnote: "This link expires in 24 hours.",
    variables: ["{{email}}", "{{token}}"],
    tips: ["Confirm ownership before sending anything else, including marketing.", "Expire links after 24 hours and let users request a new one.", "Show the address in the email so users notice typos."],
    related: ["welcome", "verification-code", "magic-link"],
  },
  {
    slug: "magic-link",
    name: "Magic link sign-in",
    keyword: "magic link email template",
    description: "A free magic link (passwordless sign-in) email template with subject lines, security copy and responsive HTML.",
    subjects: ["Your sign-in link for Acme", "Sign in to Acme", "Here's your login link"],
    preheader: "This link expires in 15 minutes and can be used once.",
    heading: "Sign in to Acme",
    paragraphs: [
      "Click the button below to sign in. This link expires in 15 minutes and can only be used once.",
      "If you didn't try to sign in, you can ignore this email. Someone may have typed your address by mistake.",
    ],
    button: { label: "Sign in", href: "https://acme.com/auth/callback?token={{token}}" },
    footnote: "Requested from {{location}} at {{time}}.",
    variables: ["{{token}}", "{{location}}", "{{time}}"],
    tips: ["Use short expiry (10 to 15 minutes) and single-use tokens.", "Include where and when the request came from.", "Deliverability is everything here: send from a warm, authenticated transactional subdomain."],
    related: ["verification-code", "password-reset", "new-login-alert"],
  },
  {
    slug: "verification-code",
    name: "Verification code (OTP)",
    keyword: "otp email template",
    description: "A free one-time password (OTP) and verification code email template with subject lines and responsive HTML.",
    subjects: ["{{code}} is your Acme verification code", "Your Acme login code: {{code}}", "Your verification code"],
    preheader: "Enter this code to continue. It expires in 10 minutes.",
    heading: "Your verification code",
    paragraphs: ["Enter this code to continue signing in. It expires in 10 minutes.", "If you didn't request this code, someone may be trying to access your account. You can ignore this email; we won't sign anyone in without the code."],
    code: "482 913",
    footnote: "Never share this code with anyone, including Acme staff.",
    variables: ["{{code}}"],
    tips: ["Put the code in the subject line so it shows in notifications.", "Expire codes after 10 minutes and limit attempts.", "Avoid links in OTP emails; they look like phishing."],
    related: ["magic-link", "email-verification", "new-login-alert"],
  },
  {
    slug: "order-confirmation",
    name: "Order confirmation",
    keyword: "order confirmation email template",
    description: "A free order confirmation email template for e-commerce, with subject lines, an order summary table and responsive HTML.",
    subjects: ["Order #{{order_number}} confirmed", "Thanks for your order, {{first_name}}!", "We've received your order"],
    preheader: "We'll email you again when it ships.",
    heading: "Thanks for your order!",
    paragraphs: ["Hi {{first_name}}, we've received your order and are getting it ready. We'll email you again when it ships.", "Questions about your order? Just reply to this email."],
    button: { label: "View order", href: "https://acme.com/orders/{{order_number}}" },
    table: [["Order", "#10482"], ["Merino crew sweater × 1", "$89.00"], ["Shipping", "$5.00"], ["Total", "$94.00"]],
    footnote: "You're receiving this because you placed an order with Acme.",
    variables: ["{{first_name}}", "{{order_number}}", "{{items}}", "{{total}}"],
    tips: ["Send immediately after payment succeeds.", "Include the order number in the subject so customers can search for it.", "Keep promotions to a minimum; this is a transactional email."],
    related: ["shipping-confirmation", "payment-receipt", "invoice"],
  },
  {
    slug: "shipping-confirmation",
    name: "Shipping confirmation",
    keyword: "shipping confirmation email template",
    description: "A free shipping confirmation email template with tracking button, subject lines and responsive HTML.",
    subjects: ["Your order is on its way", "Order #{{order_number}} has shipped", "Good news: your package shipped"],
    preheader: "Track your package with {{carrier}}.",
    heading: "Your order is on its way",
    paragraphs: ["Your order #{{order_number}} has shipped with {{carrier}} and should arrive by {{delivery_date}}.", "Tracking can take a few hours to update after the label is created."],
    button: { label: "Track package", href: "{{tracking_url}}" },
    footnote: "You're receiving this because you placed an order with Acme.",
    variables: ["{{order_number}}", "{{carrier}}", "{{delivery_date}}", "{{tracking_url}}"],
    tips: ["Link to the carrier's tracking page or your own tracking page.", "Give an estimated delivery date, not just a tracking number."],
    related: ["order-confirmation", "payment-receipt"],
  },
  {
    slug: "invoice",
    name: "Invoice",
    keyword: "invoice email template",
    description: "A free invoice email template with subject lines, amount due, payment button and responsive HTML for SaaS and services.",
    subjects: ["Invoice {{invoice_number}} from Acme", "Your Acme invoice for {{month}}", "Invoice {{invoice_number}}: {{amount}} due {{due_date}}"],
    preheader: "{{amount}} due on {{due_date}}.",
    heading: "Your invoice is ready",
    paragraphs: ["Hi {{first_name}}, here's your invoice for {{month}}. The PDF is attached for your records.", "Thanks for your business. Reply to this email with any billing questions."],
    button: { label: "Pay invoice", href: "https://acme.com/invoices/{{invoice_number}}" },
    table: [["Invoice", "INV-2026-0142"], ["Due date", "November 30, 2026"], ["Amount due", "$250.00"]],
    footnote: "Acme Inc. · VAT/Tax ID 12-3456789",
    variables: ["{{invoice_number}}", "{{amount}}", "{{due_date}}", "{{month}}"],
    tips: ["Attach the PDF invoice and link to an online copy.", "Put the amount and due date in the preheader.", "Send from a billing address that accepts replies."],
    related: ["payment-receipt", "payment-failed", "order-confirmation"],
  },
  {
    slug: "payment-receipt",
    name: "Payment receipt",
    keyword: "payment receipt email template",
    description: "A free payment receipt email template for subscriptions and one-off payments, with a summary table and responsive HTML.",
    subjects: ["Your Acme receipt", "Receipt for your payment of {{amount}}", "Payment received, thank you"],
    preheader: "We received your payment of {{amount}}.",
    heading: "Payment received",
    paragraphs: ["Thanks, {{first_name}}. We received your payment. Your receipt is below.", "You can download past receipts from Settings > Billing at any time."],
    table: [["Plan", "Pro (monthly)"], ["Date", "November 5, 2026"], ["Payment method", "Visa ending 4242"], ["Total paid", "$25.00"]],
    footnote: "Keep this email for your records.",
    variables: ["{{amount}}", "{{plan}}", "{{date}}", "{{card_last4}}"],
    tips: ["Include the date, amount, plan and payment method.", "Link to the billing page for downloads and changes."],
    related: ["invoice", "payment-failed", "order-confirmation"],
  },
  {
    slug: "payment-failed",
    name: "Payment failed (dunning)",
    keyword: "payment failed email template",
    description: "A free failed payment (dunning) email template with friendly copy, an update-card button and responsive HTML.",
    subjects: ["Your payment didn't go through", "Action needed: update your payment method", "We couldn't process your payment"],
    preheader: "Update your card to keep your account active.",
    heading: "Your payment didn't go through",
    paragraphs: ["We tried to charge your card for your Acme subscription, but the payment was declined. This sometimes happens when a card expires or a bank blocks a charge.", "We'll retry automatically in 3 days. Update your card before then to avoid any interruption."],
    button: { label: "Update payment method", href: "https://acme.com/settings/billing" },
    footnote: "Your account stays active while we retry.",
    variables: ["{{amount}}", "{{retry_date}}"],
    tips: ["Be friendly, not alarming: most failures are expired cards.", "Say exactly when you'll retry and when access changes.", "Send a short sequence (day 0, 3, 7) and stop once payment succeeds."],
    related: ["payment-receipt", "invoice", "trial-ending"],
  },
  {
    slug: "trial-ending",
    name: "Trial ending",
    keyword: "trial ending email template",
    description: "A free trial ending reminder email template with subject lines, clear dates and responsive HTML.",
    subjects: ["Your trial ends in 3 days", "Your Acme trial ends on {{end_date}}", "Keep your work: choose a plan"],
    preheader: "Choose a plan to keep everything you've set up.",
    heading: "Your trial ends in 3 days",
    paragraphs: ["Your free trial of Acme ends on {{end_date}}. Choose a plan to keep your projects, settings and team.", "If you don't upgrade, your account moves to the free plan. Nothing is deleted."],
    button: { label: "Choose a plan", href: "https://acme.com/settings/billing" },
    footnote: "Questions about plans? Reply and we'll help.",
    variables: ["{{end_date}}"],
    tips: ["Send 3 days and 1 day before the end, plus on the day.", "Say clearly what happens if they don't upgrade.", "If a card is on file, say when it will be charged and how to cancel."],
    related: ["payment-failed", "welcome", "payment-receipt"],
  },
  {
    slug: "team-invitation",
    name: "Team invitation",
    keyword: "invitation email template",
    description: "A free team invitation email template for SaaS workspaces, with subject lines, inviter context and responsive HTML.",
    subjects: ["{{inviter}} invited you to join {{team}} on Acme", "Join {{team}} on Acme", "You've been invited to {{team}}"],
    preheader: "Accept the invitation to start collaborating.",
    heading: "Join {{team}} on Acme",
    paragraphs: ["{{inviter}} ({{inviter_email}}) invited you to join the {{team}} team on Acme as {{role}}.", "This invitation expires in 7 days. If you weren't expecting it, you can ignore this email."],
    button: { label: "Accept invitation", href: "https://acme.com/invite/{{token}}" },
    footnote: "You're receiving this because {{inviter}} invited you to Acme.",
    variables: ["{{inviter}}", "{{inviter_email}}", "{{team}}", "{{role}}", "{{token}}"],
    tips: ["Name the person who invited them: it's the main reason people open it.", "Expire invitations and let admins resend them."],
    related: ["welcome", "email-verification"],
  },
  {
    slug: "new-login-alert",
    name: "New sign-in alert",
    keyword: "security alert email template",
    description: "A free new sign-in (security alert) email template showing device, location and time, with responsive HTML.",
    subjects: ["New sign-in to your Acme account", "Was this you? New sign-in from {{device}}", "Security alert: new sign-in"],
    preheader: "{{device}} · {{location}} · {{time}}",
    heading: "New sign-in to your account",
    paragraphs: ["Your Acme account was just signed in to from a new device.", "If this was you, there's nothing to do. If not, reset your password right away and turn on two-factor authentication."],
    table: [["Device", "Chrome on macOS"], ["Location", "Lisbon, Portugal (approximate)"], ["Time", "Nov 5, 2026, 09:41 UTC"]],
    button: { label: "Secure my account", href: "https://acme.com/settings/security" },
    footnote: "We send this email for every sign-in from a new device.",
    variables: ["{{device}}", "{{location}}", "{{time}}"],
    tips: ["Only alert on new devices or locations to avoid fatigue.", "Make the 'not me' path one click away."],
    related: ["password-reset", "verification-code", "magic-link"],
  },
];

export const templateBySlug = (slug: string) => TEMPLATES.find((t) => t.slug === slug);
