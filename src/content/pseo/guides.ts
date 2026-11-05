/**
 * /send-email/[slug]: "how to send email with <language/framework>" guides.
 * Every guide shows the HTTP API (no SDK lock-in) and an SMTP alternative
 * using that ecosystem's standard mail library.
 */
export type Guide = {
  slug: string;
  name: string;
  group: "JavaScript & TypeScript" | "Python" | "PHP" | "Ruby" | "Go, Rust & JVM" | ".NET & Elixir" | "Tools";
  lang: string; // code fence language
  summary: string;
  setup: string; // Markdown: install / env
  api: string; // code
  apiFile?: string;
  smtp?: { code: string; lib: string; file?: string };
  extra?: string; // Markdown: framework-specific notes
  faq?: { q: string; a: string }[];
  related: string[];
};

const KEY = "STACKEMAILS_API_KEY";
const FROM = "Acme <hello@mail.acme.com>";

export const GUIDES: Guide[] = [
  {
    slug: "nodejs",
    name: "Node.js",
    group: "JavaScript & TypeScript",
    lang: "js",
    summary: "Send email from Node.js with a single fetch call to the Stack Emails API, or with Nodemailer over SMTP. Works on Node 18+ with no extra dependencies.",
    setup: `Node 18 and later include \`fetch\`, so no HTTP library is needed. Store your API key in an environment variable:

\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "send.mjs",
    api: `const res = await fetch("https://stackemails.com/v1/emails", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.${KEY}}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "${FROM}",
    to: "ada@example.com",
    subject: "Welcome to Acme",
    html: "<p>Thanks for signing up!</p>",
    text: "Thanks for signing up!",
  }),
});

const data = await res.json();
if (!res.ok) throw new Error(data.error?.message ?? "Send failed");
console.log("Queued", data.id);`,
    smtp: {
      lib: "Nodemailer",
      file: "smtp.mjs",
      code: `// npm install nodemailer
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: "smtp.stackemails.com",
  port: 465,
  secure: true,
  auth: { user: "stackemails", pass: process.env.${KEY} },
});

await transport.sendMail({
  from: "${FROM}",
  to: "ada@example.com",
  subject: "Welcome to Acme",
  html: "<p>Thanks for signing up!</p>",
});`,
    },
    extra: `## Using the SDK instead

\`\`\`bash
npm install stackemails
\`\`\`

\`\`\`js
import { StackEmails } from "stackemails";

const stack = new StackEmails(process.env.${KEY});
const { id } = await stack.emails.send({ from: "${FROM}", to: "ada@example.com", subject: "Hi", html: "<p>Hi</p>" });
\`\`\``,
    faq: [
      { q: "Do I need Nodemailer to send email from Node.js?", a: "No. With an email API you only need fetch, which is built into Node 18+. Nodemailer is useful when you want SMTP or already use it." },
      { q: "How do I send an attachment from Node.js?", a: "Read the file, base64-encode it with Buffer.from(bytes).toString('base64'), and add { filename, content } to the attachments array." },
    ],
    related: ["express", "nestjs", "bun", "deno"],
  },
  {
    slug: "express",
    name: "Express",
    group: "JavaScript & TypeScript",
    lang: "js",
    summary: "Send transactional email from an Express route: a contact form or sign-up handler that calls the Stack Emails API and returns errors cleanly.",
    setup: `\`\`\`bash
npm install express
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "server.js",
    api: `import express from "express";

const app = express();
app.use(express.json());

async function sendEmail(payload) {
  const res = await fetch("https://stackemails.com/v1/emails", {
    method: "POST",
    headers: { Authorization: \`Bearer \${process.env.${KEY}}\`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Send failed");
  return data;
}

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body ?? {};
  if (!email || !message) return res.status(422).json({ error: "Email and message are required." });
  try {
    await sendEmail({
      from: "Acme Website <forms@mail.acme.com>",
      to: "support@acme.com",
      reply_to: email,
      subject: \`New message from \${name || email}\`,
      text: message,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(3000);`,
    extra: `## Notes

- Use \`reply_to\` so replying in your inbox goes to the visitor, while the From address stays on your verified domain.
- Rate-limit public form routes (for example with \`express-rate-limit\`) so bots can't use your quota.`,
    related: ["nodejs", "nestjs", "nextjs"],
  },
  {
    slug: "nestjs",
    name: "NestJS",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Wrap the Stack Emails API in an injectable NestJS service so any module can send transactional email with one method call.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "mail.service.ts",
    api: `import { Injectable, InternalServerErrorException } from "@nestjs/common";

type Email = { to: string | string[]; subject: string; html?: string; text?: string };

@Injectable()
export class MailService {
  private readonly from = "${FROM}";

  async send(email: Email) {
    const res = await fetch("https://stackemails.com/v1/emails", {
      method: "POST",
      headers: { Authorization: \`Bearer \${process.env.${KEY}}\`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, ...email }),
    });
    const data = await res.json();
    if (!res.ok) throw new InternalServerErrorException(data.error?.message ?? "Email failed");
    return data as { id: string; status: string };
  }
}`,
    extra: `Register \`MailService\` in a \`MailModule\`, export it, and inject it where you need it:

\`\`\`ts
constructor(private readonly mail: MailService) {}

await this.mail.send({ to: user.email, subject: "Verify your email", html: verifyHtml });
\`\`\``,
    related: ["nodejs", "express"],
  },
  {
    slug: "bun",
    name: "Bun",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Send email from Bun with the built-in fetch and Bun.env. No packages to install.",
    setup: `Bun loads \`.env\` automatically:

\`\`\`bash
echo "${KEY}=se_live_xxxxxxxxxxxx" >> .env
\`\`\``,
    apiFile: "send.ts",
    api: `const res = await fetch("https://stackemails.com/v1/emails", {
  method: "POST",
  headers: { Authorization: \`Bearer \${Bun.env.${KEY}}\`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "${FROM}",
    to: "ada@example.com",
    subject: "Hello from Bun",
    html: "<p>Sent with Bun and Stack Emails.</p>",
  }),
});

console.log(res.status, await res.json());`,
    related: ["nodejs", "deno", "cloudflare-workers"],
  },
  {
    slug: "deno",
    name: "Deno",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Send email from Deno (and Deno Deploy) with fetch. Run with --allow-net and --allow-env.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
deno run --allow-net=stackemails.com --allow-env=${KEY} send.ts
\`\`\``,
    apiFile: "send.ts",
    api: `const res = await fetch("https://stackemails.com/v1/emails", {
  method: "POST",
  headers: { Authorization: \`Bearer \${Deno.env.get("${KEY}")}\`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "${FROM}",
    to: "ada@example.com",
    subject: "Hello from Deno",
    html: "<p>Sent with Deno and Stack Emails.</p>",
  }),
});

console.log(res.status, await res.json());`,
    related: ["bun", "supabase-edge-functions", "nodejs"],
  },
  {
    slug: "cloudflare-workers",
    name: "Cloudflare Workers",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Send email from a Cloudflare Worker over HTTPS. Workers can't open SMTP connections on port 25, so an HTTP email API is the simplest route.",
    setup: `Store the key as a secret:

\`\`\`bash
npx wrangler secret put ${KEY}
\`\`\``,
    apiFile: "src/index.ts",
    api: `export interface Env { ${KEY}: string }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { email } = await request.json<{ email: string }>();

    const res = await fetch("https://stackemails.com/v1/emails", {
      method: "POST",
      headers: { Authorization: \`Bearer \${env.${KEY}}\`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "${FROM}",
        to: email,
        subject: "You're on the list",
        html: "<p>Thanks for joining the waitlist.</p>",
      }),
    });

    return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
  },
};`,
    faq: [{ q: "Can Cloudflare Workers send email over SMTP?", a: "Workers can open outbound TCP sockets, but many mail ports are restricted and SMTP libraries expect Node APIs. An HTTPS email API works everywhere with plain fetch." }],
    related: ["deno", "bun", "nextjs"],
  },
  {
    slug: "supabase-edge-functions",
    name: "Supabase Edge Functions",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Send email from a Supabase Edge Function (Deno) with fetch, for example after a database insert or from your client app.",
    setup: `\`\`\`bash
supabase functions new send-email
supabase secrets set ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "supabase/functions/send-email/index.ts",
    api: `Deno.serve(async (req) => {
  const { to, subject, html } = await req.json();

  const res = await fetch("https://stackemails.com/v1/emails", {
    method: "POST",
    headers: { Authorization: \`Bearer \${Deno.env.get("${KEY}")}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "${FROM}", to, subject, html }),
  });

  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
});`,
    extra: `Deploy with \`supabase functions deploy send-email\`. Validate the caller (for example, check the user's JWT) before sending, so the function can't be used to email arbitrary addresses.

You can also use Stack Emails as Supabase Auth's custom SMTP server: host \`smtp.stackemails.com\`, port 465, username \`stackemails\`, password an API key.`,
    related: ["deno", "nextjs", "cloudflare-workers"],
  },
  {
    slug: "nextjs",
    name: "Next.js",
    group: "JavaScript & TypeScript",
    lang: "ts",
    summary: "Send email from a Next.js Server Action or Route Handler, keeping your API key on the server.",
    setup: `Add the key to \`.env.local\` (never prefix it with \`NEXT_PUBLIC_\`):

\`\`\`bash
${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "app/actions.ts",
    api: `"use server";

export async function sendWelcome(formData: FormData) {
  const email = String(formData.get("email") ?? "");

  const res = await fetch("https://stackemails.com/v1/emails", {
    method: "POST",
    headers: { Authorization: \`Bearer \${process.env.${KEY}}\`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "${FROM}",
      to: email,
      subject: "Welcome to Acme",
      html: "<p>Thanks for signing up!</p>",
    }),
  });

  if (!res.ok) return { ok: false, error: (await res.json()).error?.message };
  return { ok: true };
}`,
    extra: `For a full walkthrough with React Email templates and a Route Handler, read [how to send email with Next.js](/blog/send-email-nextjs).`,
    related: ["nodejs", "express", "cloudflare-workers"],
  },
  {
    slug: "python",
    name: "Python",
    group: "Python",
    lang: "python",
    summary: "Send email from Python with the requests library and the Stack Emails API, or with the standard library's smtplib over SMTP.",
    setup: `\`\`\`bash
pip install requests
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "send.py",
    api: `import os
import requests

res = requests.post(
    "https://stackemails.com/v1/emails",
    headers={"Authorization": f"Bearer {os.environ['${KEY}']}"},
    json={
        "from": "${FROM}",
        "to": "ada@example.com",
        "subject": "Welcome to Acme",
        "html": "<p>Thanks for signing up!</p>",
    },
    timeout=10,
)
res.raise_for_status()
print("Queued", res.json()["id"])`,
    smtp: {
      lib: "smtplib",
      file: "send_smtp.py",
      code: `import os
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["From"] = "${FROM}"
msg["To"] = "ada@example.com"
msg["Subject"] = "Welcome to Acme"
msg.set_content("Thanks for signing up!")
msg.add_alternative("<p>Thanks for signing up!</p>", subtype="html")

with smtplib.SMTP_SSL("smtp.stackemails.com", 465) as smtp:
    smtp.login("stackemails", os.environ["${KEY}"])
    smtp.send_message(msg)`,
    },
    extra: `## Sending an attachment

\`\`\`python
import base64

with open("invoice.pdf", "rb") as f:
    pdf = base64.b64encode(f.read()).decode()

payload["attachments"] = [{"filename": "invoice.pdf", "content": pdf}]
\`\`\``,
    faq: [
      { q: "How do I send email in Python without Gmail?", a: "Use an email API or SMTP relay with your own domain. With Stack Emails, a requests.post call to /v1/emails sends the message; no Gmail account or app password is involved." },
      { q: "Is smtplib or an API better in Python?", a: "Both work. smtplib needs no dependencies; an HTTP API returns a message ID immediately, supports scheduling and tags, and isn't affected by blocked SMTP ports." },
    ],
    related: ["django", "flask", "fastapi"],
  },
  {
    slug: "django",
    name: "Django",
    group: "Python",
    lang: "python",
    summary: "Configure Django's built-in email backend to send through Stack Emails over SMTP, so send_mail, password-reset emails and admin errors just work.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "settings.py",
    api: `import os

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.stackemails.com"
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_HOST_USER = "stackemails"
EMAIL_HOST_PASSWORD = os.environ["${KEY}"]
DEFAULT_FROM_EMAIL = "${FROM}"
SERVER_EMAIL = "alerts@mail.acme.com"`,
    extra: `## Send a message

\`\`\`python
from django.core.mail import send_mail

send_mail(
    subject="Welcome to Acme",
    message="Thanks for signing up!",
    from_email=None,  # uses DEFAULT_FROM_EMAIL
    recipient_list=["ada@example.com"],
    html_message="<p>Thanks for signing up!</p>",
)
\`\`\`

Django's password reset views use the same backend automatically. Use port 587 with \`EMAIL_USE_TLS = True\` instead of 465 + \`EMAIL_USE_SSL\` if you prefer STARTTLS; don't set both.

## Calling the API instead

For scheduling, tags or idempotency keys, call the HTTP API with \`requests\` as shown in the [Python guide](/send-email/python), ideally from a Celery task.`,
    related: ["python", "flask", "fastapi"],
  },
  {
    slug: "flask",
    name: "Flask",
    group: "Python",
    lang: "python",
    summary: "Send email from a Flask route by calling the Stack Emails API with requests.",
    setup: `\`\`\`bash
pip install flask requests
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "app.py",
    api: `import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.post("/signup")
def signup():
    email = request.json.get("email")
    res = requests.post(
        "https://stackemails.com/v1/emails",
        headers={"Authorization": f"Bearer {os.environ['${KEY}']}"},
        json={
            "from": "${FROM}",
            "to": email,
            "subject": "Confirm your email",
            "html": "<p>Click the link to confirm your account.</p>",
        },
        timeout=10,
    )
    if not res.ok:
        return jsonify(error=res.json()["error"]["message"]), 502
    return jsonify(ok=True)`,
    extra: `Prefer SMTP? Flask-Mail works with \`MAIL_SERVER = "smtp.stackemails.com"\`, \`MAIL_PORT = 465\`, \`MAIL_USE_SSL = True\`, \`MAIL_USERNAME = "stackemails"\` and your API key as \`MAIL_PASSWORD\`.`,
    related: ["python", "django", "fastapi"],
  },
  {
    slug: "fastapi",
    name: "FastAPI",
    group: "Python",
    lang: "python",
    summary: "Send email from FastAPI with httpx's async client, without blocking the event loop, optionally in a background task.",
    setup: `\`\`\`bash
pip install fastapi httpx
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "main.py",
    api: `import os
import httpx
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

async def send_welcome(email: str) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            "https://stackemails.com/v1/emails",
            headers={"Authorization": f"Bearer {os.environ['${KEY}']}"},
            json={
                "from": "${FROM}",
                "to": email,
                "subject": "Welcome to Acme",
                "html": "<p>Thanks for signing up!</p>",
            },
        )
        res.raise_for_status()

@app.post("/users")
async def create_user(email: str, background: BackgroundTasks):
    # ... create the user ...
    background.add_task(send_welcome, email)
    return {"ok": True}`,
    related: ["python", "django", "flask"],
  },
  {
    slug: "php",
    name: "PHP",
    group: "PHP",
    lang: "php",
    summary: "Send email from plain PHP with cURL and the Stack Emails API, or with PHPMailer over SMTP, instead of the unreliable mail() function.",
    setup: `Set the key in your server environment (or \`.env\` loaded by your framework):

\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "send.php",
    api: `<?php
$payload = [
    "from" => "${FROM}",
    "to" => "ada@example.com",
    "subject" => "Welcome to Acme",
    "html" => "<p>Thanks for signing up!</p>",
];

$ch = curl_init("https://stackemails.com/v1/emails");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("${KEY}"),
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 10,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($body, true);
if ($status >= 300) {
    throw new RuntimeException($data["error"]["message"] ?? "Send failed");
}
echo "Queued " . $data["id"];`,
    smtp: {
      lib: "PHPMailer",
      file: "smtp.php",
      code: `<?php
// composer require phpmailer/phpmailer
use PHPMailer\\PHPMailer\\PHPMailer;

require "vendor/autoload.php";

$mail = new PHPMailer(true);
$mail->isSMTP();
$mail->Host = "smtp.stackemails.com";
$mail->Port = 465;
$mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
$mail->SMTPAuth = true;
$mail->Username = "stackemails";
$mail->Password = getenv("${KEY}");

$mail->setFrom("hello@mail.acme.com", "Acme");
$mail->addAddress("ada@example.com");
$mail->isHTML(true);
$mail->Subject = "Welcome to Acme";
$mail->Body = "<p>Thanks for signing up!</p>";
$mail->send();`,
    },
    faq: [{ q: "Why shouldn't I use PHP's mail() function?", a: "mail() hands the message to the server's local mailer, usually without DKIM for your domain, so it often lands in spam or is rejected. An API or authenticated SMTP relay signs mail for your domain and reports bounces." }],
    related: ["laravel", "wordpress", "symfony"],
  },
  {
    slug: "laravel",
    name: "Laravel",
    group: "PHP",
    lang: "php",
    summary: "Point Laravel's mailer at the Stack Emails SMTP relay with a few .env values, then send Mailables as usual.",
    setup: `Update \`.env\`:

\`\`\`bash
MAIL_MAILER=smtp
MAIL_HOST=smtp.stackemails.com
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=stackemails
MAIL_PASSWORD=se_live_xxxxxxxxxxxx
MAIL_FROM_ADDRESS=hello@mail.acme.com
MAIL_FROM_NAME="Acme"
\`\`\`

(In Laravel 11+, \`MAIL_SCHEME=smtps\` replaces \`MAIL_ENCRYPTION=ssl\` for port 465.)`,
    apiFile: "app/Http/Controllers/SignupController.php",
    api: `use App\\Mail\\WelcomeMail;
use Illuminate\\Support\\Facades\\Mail;

Mail::to($user->email)->send(new WelcomeMail($user));

// Or queue it so the request returns immediately:
Mail::to($user->email)->queue(new WelcomeMail($user));`,
    extra: `## Calling the API directly

Laravel's HTTP client works too, which is handy for scheduling or tags:

\`\`\`php
use Illuminate\\Support\\Facades\\Http;

Http::withToken(env("${KEY}"))
    ->post("https://stackemails.com/v1/emails", [
        "from" => "${FROM}",
        "to" => $user->email,
        "subject" => "Your invoice",
        "html" => view("emails.invoice", ["user" => $user])->render(),
        "scheduled_at" => now()->addHour()->toIso8601String(),
    ])
    ->throw();
\`\`\``,
    related: ["php", "wordpress", "symfony"],
  },
  {
    slug: "symfony",
    name: "Symfony",
    group: "PHP",
    lang: "php",
    summary: "Configure Symfony Mailer with a Stack Emails SMTP DSN and send emails with the MailerInterface.",
    setup: `In \`.env.local\` (URL-encode the key if it contains special characters):

\`\`\`bash
MAILER_DSN=smtps://stackemails:se_live_xxxxxxxxxxxx@smtp.stackemails.com:465
\`\`\``,
    apiFile: "src/Controller/SignupController.php",
    api: `use Symfony\\Component\\Mailer\\MailerInterface;
use Symfony\\Component\\Mime\\Email;

public function signup(MailerInterface $mailer): Response
{
    $email = (new Email())
        ->from("${FROM}")
        ->to("ada@example.com")
        ->subject("Welcome to Acme")
        ->html("<p>Thanks for signing up!</p>");

    $mailer->send($email);
    // ...
}`,
    related: ["php", "laravel"],
  },
  {
    slug: "wordpress",
    name: "WordPress",
    group: "PHP",
    lang: "php",
    summary: "Make WordPress emails (contact forms, WooCommerce orders, password resets) reliable by routing wp_mail() through the Stack Emails SMTP relay.",
    setup: `Install an SMTP plugin such as **WP Mail SMTP** or **FluentSMTP** and choose "Other SMTP":

| Setting | Value |
| --- | --- |
| SMTP host | \`smtp.stackemails.com\` |
| Encryption | SSL |
| Port | 465 |
| Authentication | On |
| Username | \`stackemails\` |
| Password | Your API key |
| From email | An address on your verified domain |`,
    apiFile: "functions.php",
    api: `// Or without a plugin: configure PHPMailer from your theme or a small mu-plugin.
add_action("phpmailer_init", function ($phpmailer) {
    $phpmailer->isSMTP();
    $phpmailer->Host = "smtp.stackemails.com";
    $phpmailer->Port = 465;
    $phpmailer->SMTPSecure = "ssl";
    $phpmailer->SMTPAuth = true;
    $phpmailer->Username = "stackemails";
    $phpmailer->Password = defined("STACKEMAILS_API_KEY") ? STACKEMAILS_API_KEY : "";
});

add_filter("wp_mail_from", fn () => "hello@mail.acme.com");
add_filter("wp_mail_from_name", fn () => "Acme");`,
    extra: `Define the key in \`wp-config.php\` (\`define("STACKEMAILS_API_KEY", "se_live_...");\`) rather than in the database. Many hosts block outbound port 25, but ports 465 and 587 to an authenticated relay are almost always allowed.`,
    faq: [{ q: "Why are WordPress emails going to spam?", a: "By default WordPress sends with PHP mail() from your web server, which isn't authenticated for your domain. Routing wp_mail() through an SMTP relay with SPF and DKIM for your domain fixes it." }],
    related: ["php", "laravel"],
  },
  {
    slug: "ruby",
    name: "Ruby",
    group: "Ruby",
    lang: "ruby",
    summary: "Send email from Ruby with Net::HTTP and the Stack Emails API, with no gems required.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "send.rb",
    api: `require "net/http"
require "json"

uri = URI("https://stackemails.com/v1/emails")
req = Net::HTTP::Post.new(uri, {
  "Authorization" => "Bearer #{ENV.fetch("${KEY}")}",
  "Content-Type" => "application/json",
})
req.body = {
  from: "${FROM}",
  to: "ada@example.com",
  subject: "Welcome to Acme",
  html: "<p>Thanks for signing up!</p>",
}.to_json

res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
raise JSON.parse(res.body).dig("error", "message") unless res.is_a?(Net::HTTPSuccess)
puts JSON.parse(res.body)["id"]`,
    related: ["rails", "python"],
  },
  {
    slug: "rails",
    name: "Ruby on Rails",
    group: "Ruby",
    lang: "ruby",
    summary: "Configure Action Mailer to deliver through the Stack Emails SMTP relay, then use deliver_later as usual.",
    setup: `Store the key in credentials (\`bin/rails credentials:edit\`) as \`stackemails_api_key\`, or in an environment variable.`,
    apiFile: "config/environments/production.rb",
    api: `config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: "smtp.stackemails.com",
  port: 465,
  user_name: "stackemails",
  password: Rails.application.credentials.stackemails_api_key,
  authentication: :plain,
  tls: true,
}
config.action_mailer.default_url_options = { host: "acme.com" }`,
    extra: `## Send a mailer

\`\`\`ruby
class UserMailer < ApplicationMailer
  default from: "${FROM}"

  def welcome(user)
    @user = user
    mail(to: user.email, subject: "Welcome to Acme")
  end
end

UserMailer.welcome(user).deliver_later
\`\`\`

\`tls: true\` uses implicit TLS on port 465. For port 587 use \`enable_starttls_auto: true\` instead.`,
    related: ["ruby", "django", "laravel"],
  },
  {
    slug: "go",
    name: "Go",
    group: "Go, Rust & JVM",
    lang: "go",
    summary: "Send email from Go with net/http and encoding/json, using only the standard library.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "main.go",
    api: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

func main() {
	body, _ := json.Marshal(map[string]any{
		"from":    "${FROM}",
		"to":      "ada@example.com",
		"subject": "Welcome to Acme",
		"html":    "<p>Thanks for signing up!</p>",
	})

	req, _ := http.NewRequest("POST", "https://stackemails.com/v1/emails", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("${KEY}"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	fmt.Println(res.StatusCode, out)
}`,
    smtp: {
      lib: "net/smtp",
      file: "smtp.go",
      code: `package main

import (
	"crypto/tls"
	"net/smtp"
	"os"
)

func main() {
	host := "smtp.stackemails.com"
	conn, err := tls.Dial("tcp", host+":465", &tls.Config{ServerName: host})
	if err != nil {
		panic(err)
	}
	c, _ := smtp.NewClient(conn, host)
	defer c.Quit()

	c.Auth(smtp.PlainAuth("", "stackemails", os.Getenv("${KEY}"), host))
	c.Mail("hello@mail.acme.com")
	c.Rcpt("ada@example.com")
	w, _ := c.Data()
	w.Write([]byte("From: Acme <hello@mail.acme.com>\\r\\nTo: ada@example.com\\r\\nSubject: Welcome\\r\\nContent-Type: text/html; charset=UTF-8\\r\\n\\r\\n<p>Hello!</p>"))
	w.Close()
}`,
    },
    related: ["rust", "java", "python"],
  },
  {
    slug: "rust",
    name: "Rust",
    group: "Go, Rust & JVM",
    lang: "rust",
    summary: "Send email from Rust with reqwest and serde_json, or with the lettre crate over SMTP.",
    setup: `\`\`\`toml
# Cargo.toml
[dependencies]
reqwest = { version = "0.12", features = ["json"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
\`\`\``,
    apiFile: "src/main.rs",
    api: `use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let key = std::env::var("${KEY}").expect("${KEY} not set");

    let res = reqwest::Client::new()
        .post("https://stackemails.com/v1/emails")
        .bearer_auth(key)
        .json(&json!({
            "from": "${FROM}",
            "to": "ada@example.com",
            "subject": "Welcome to Acme",
            "html": "<p>Thanks for signing up!</p>"
        }))
        .send()
        .await?;

    println!("{} {}", res.status(), res.text().await?);
    Ok(())
}`,
    related: ["go", "java", "nodejs"],
  },
  {
    slug: "java",
    name: "Java",
    group: "Go, Rust & JVM",
    lang: "java",
    summary: "Send email from Java 11+ with the built-in HttpClient and the Stack Emails API.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "SendEmail.java",
    api: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SendEmail {
  public static void main(String[] args) throws Exception {
    String json = """
      {
        "from": "${FROM}",
        "to": "ada@example.com",
        "subject": "Welcome to Acme",
        "html": "<p>Thanks for signing up!</p>"
      }
      """;

    HttpRequest req = HttpRequest.newBuilder(URI.create("https://stackemails.com/v1/emails"))
        .header("Authorization", "Bearer " + System.getenv("${KEY}"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

    HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
    System.out.println(res.statusCode() + " " + res.body());
  }
}`,
    extra: `Text blocks (\`"""\`) need Java 15+. On Java 11, build the JSON string normally or use Jackson.`,
    related: ["spring-boot", "go", "dotnet"],
  },
  {
    slug: "spring-boot",
    name: "Spring Boot",
    group: "Go, Rust & JVM",
    lang: "java",
    summary: "Send email from Spring Boot with spring-boot-starter-mail and JavaMailSender pointed at the Stack Emails SMTP relay.",
    setup: `Add \`spring-boot-starter-mail\`, then configure \`application.properties\`:

\`\`\`properties
spring.mail.host=smtp.stackemails.com
spring.mail.port=465
spring.mail.username=stackemails
spring.mail.password=\${${KEY}}
spring.mail.protocol=smtps
spring.mail.properties.mail.smtp.auth=true
\`\`\``,
    apiFile: "WelcomeMailer.java",
    api: `import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class WelcomeMailer {
  private final JavaMailSender mailer;

  public WelcomeMailer(JavaMailSender mailer) { this.mailer = mailer; }

  public void send(String to) throws Exception {
    MimeMessage msg = mailer.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
    helper.setFrom("hello@mail.acme.com", "Acme");
    helper.setTo(to);
    helper.setSubject("Welcome to Acme");
    helper.setText("<p>Thanks for signing up!</p>", true);
    mailer.send(msg);
  }
}`,
    related: ["java", "dotnet", "go"],
  },
  {
    slug: "dotnet",
    name: "C# and .NET",
    group: ".NET & Elixir",
    lang: "csharp",
    summary: "Send email from C# and ASP.NET Core with HttpClient and the Stack Emails API, or with MailKit over SMTP.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "Program.cs",
    api: `using System.Net.Http.Headers;
using System.Net.Http.Json;

var http = new HttpClient();
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("${KEY}"));

var res = await http.PostAsJsonAsync("https://stackemails.com/v1/emails", new
{
    from = "${FROM}",
    to = "ada@example.com",
    subject = "Welcome to Acme",
    html = "<p>Thanks for signing up!</p>",
});

Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");`,
    smtp: {
      lib: "MailKit",
      file: "Smtp.cs",
      code: `// dotnet add package MailKit
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

var message = new MimeMessage();
message.From.Add(new MailboxAddress("Acme", "hello@mail.acme.com"));
message.To.Add(MailboxAddress.Parse("ada@example.com"));
message.Subject = "Welcome to Acme";
message.Body = new TextPart("html") { Text = "<p>Thanks for signing up!</p>" };

using var client = new SmtpClient();
await client.ConnectAsync("smtp.stackemails.com", 465, SecureSocketOptions.SslOnConnect);
await client.AuthenticateAsync("stackemails", Environment.GetEnvironmentVariable("${KEY}"));
await client.SendAsync(message);
await client.DisconnectAsync(true);`,
    },
    extra: `In ASP.NET Core, register a typed client with \`builder.Services.AddHttpClient<EmailService>()\` instead of creating \`HttpClient\` per request. Microsoft recommends MailKit over the legacy \`System.Net.Mail.SmtpClient\`.`,
    related: ["java", "spring-boot", "go"],
  },
  {
    slug: "elixir",
    name: "Elixir and Phoenix",
    group: ".NET & Elixir",
    lang: "elixir",
    summary: "Send email from Elixir and Phoenix with the Req HTTP client and the Stack Emails API.",
    setup: `\`\`\`elixir
# mix.exs
{:req, "~> 0.5"}
\`\`\``,
    apiFile: "lib/acme/mailer.ex",
    api: `defmodule Acme.Mailer do
  def send_welcome(email) do
    Req.post!("https://stackemails.com/v1/emails",
      auth: {:bearer, System.fetch_env!("${KEY}")},
      json: %{
        from: "${FROM}",
        to: email,
        subject: "Welcome to Acme",
        html: "<p>Thanks for signing up!</p>"
      }
    )
  end
end`,
    extra: `Using Swoosh? Its SMTP adapter (with \`gen_smtp\`) works with \`relay: "smtp.stackemails.com"\`, \`port: 465\`, \`ssl: true\`, \`username: "stackemails"\` and your API key as the password.`,
    related: ["ruby", "go", "nodejs"],
  },
  {
    slug: "curl",
    name: "cURL",
    group: "Tools",
    lang: "bash",
    summary: "Send an email from the command line with a single cURL request. Handy for testing your setup or sending from shell scripts and cron jobs.",
    setup: `\`\`\`bash
export ${KEY}=se_live_xxxxxxxxxxxx
\`\`\``,
    apiFile: "terminal",
    api: `curl -X POST https://stackemails.com/v1/emails \\
  -H "Authorization: Bearer $${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "${FROM}",
    "to": "ada@example.com",
    "subject": "Hello from the command line",
    "text": "It works!"
  }'`,
    extra: `## Send to several recipients

\`"to"\` accepts an array: \`"to": ["ada@example.com", "grace@example.com"]\`. Each recipient sees the full To list; for separate messages use the [batch endpoint](/docs/emails).

## Retry safely

Add \`-H "Idempotency-Key: nightly-report-2026-11-05"\` so a retried cron job never sends twice.`,
    related: ["nodejs", "python", "go"],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
