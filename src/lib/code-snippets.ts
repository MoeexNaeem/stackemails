import { site } from "@/lib/site";

export interface Snippet {
  lang: string;
  code: string;
}

export const API_BASE = `${site.url}/v1`;

type SendArgs = { key?: string; from?: string; to?: string; subject?: string; html?: string };

/** "Send an email" in 10 languages — SDK for Node, plain HTTP everywhere else. */
export function sendEmailSnippets(a: SendArgs = {}): Snippet[] {
  const key = a.key ?? "se_live_xxxxxxxxx";
  const from = a.from ?? "Acme <onboarding@your-domain.com>";
  const to = a.to ?? "delivered@example.com";
  const subject = a.subject ?? "Hello World";
  const html = a.html ?? "<p>Congrats on sending your <strong>first email</strong>!</p>";
  const json = JSON.stringify({ from, to: [to], subject, html }, null, 2);
  const jsonInline = JSON.stringify({ from, to: [to], subject, html });
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return [
    {
      lang: "Node.js",
      code: `import { StackEmails } from "stackemails";

const stack = new StackEmails("${key}");

await stack.emails.send({
  from: "${esc(from)}",
  to: "${to}",
  subject: "${esc(subject)}",
  html: "${esc(html)}",
});`,
    },
    {
      lang: "PHP",
      code: `<?php
$ch = curl_init("${API_BASE}/emails");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer ${key}",
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "from" => "${esc(from)}",
    "to" => ["${to}"],
    "subject" => "${esc(subject)}",
    "html" => "${esc(html)}",
  ]),
]);
echo curl_exec($ch);`,
    },
    {
      lang: "Python",
      code: `import requests

r = requests.post(
    "${API_BASE}/emails",
    headers={"Authorization": "Bearer ${key}"},
    json={
        "from": "${esc(from)}",
        "to": ["${to}"],
        "subject": "${esc(subject)}",
        "html": "${esc(html)}",
    },
    timeout=10,
)
print(r.json())`,
    },
    {
      lang: "Ruby",
      code: `require "net/http"
require "json"

uri = URI("${API_BASE}/emails")
res = Net::HTTP.post(uri, ${JSON.stringify(jsonInline)},
  "Authorization" => "Bearer ${key}",
  "Content-Type" => "application/json")
puts res.body`,
    },
    {
      lang: "Go",
      code: `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

func main() {
	body := []byte(\`${jsonInline}\`)
	req, _ := http.NewRequest("POST", "${API_BASE}/emails", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer ${key}")
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	out, _ := io.ReadAll(res.Body)
	fmt.Println(string(out))
}`,
    },
    {
      lang: "Rust",
      code: `// Cargo.toml: reqwest = { version = "0.12", features = ["json", "blocking"] }, serde_json = "1"
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let res = reqwest::blocking::Client::new()
        .post("${API_BASE}/emails")
        .bearer_auth("${key}")
        .json(&serde_json::json!(${json.replace(/\n/g, "\n        ")}))
        .send()?;
    println!("{}", res.text()?);
    Ok(())
}`,
    },
    {
      lang: "Elixir",
      code: `# mix.exs: {:req, "~> 0.5"}
Req.post!("${API_BASE}/emails",
  auth: {:bearer, "${key}"},
  json: %{
    from: "${esc(from)}",
    to: ["${to}"],
    subject: "${esc(subject)}",
    html: "${esc(html)}"
  }
).body
|> IO.inspect()`,
    },
    {
      lang: "Java",
      code: `import java.net.URI;
import java.net.http.*;

public class SendEmail {
  public static void main(String[] args) throws Exception {
    String body = ${JSON.stringify(jsonInline)};
    HttpRequest req = HttpRequest.newBuilder(URI.create("${API_BASE}/emails"))
        .header("Authorization", "Bearer ${key}")
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();
    HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
    System.out.println(res.body());
  }
}`,
    },
    {
      lang: ".NET",
      code: `using System.Net.Http.Headers;
using System.Net.Http.Json;

var http = new HttpClient();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "${key}");
var res = await http.PostAsJsonAsync("${API_BASE}/emails", new {
    from = "${esc(from)}",
    to = new[] { "${to}" },
    subject = "${esc(subject)}",
    html = "${esc(html)}"
});
Console.WriteLine(await res.Content.ReadAsStringAsync());`,
    },
    {
      lang: "cURL",
      code: `curl -X POST '${API_BASE}/emails' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '${jsonInline.replace(/'/g, "'\\''")}'`,
    },
  ];
}

const domains: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { StackEmails } from "stackemails";
const stack = new StackEmails("se_live_...");

const domain = await stack.domains.create({ name: "updates.acme.com" });
console.log(domain.records); // publish these at your DNS provider
await stack.domains.verify(domain.id);`,
  },
  {
    lang: "cURL",
    code: `curl -X POST ${API_BASE}/domains \\
  -H "Authorization: Bearer se_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "updates.acme.com" }'`,
  },
];

const apiKeys: Snippet[] = [
  {
    lang: "Node.js",
    code: `// Store the key in an environment variable — never in client-side code.
// STACKEMAILS_API_KEY=se_live_...
import { StackEmails } from "stackemails";
const stack = new StackEmails(); // reads STACKEMAILS_API_KEY`,
  },
  {
    lang: "cURL",
    code: `curl ${API_BASE}/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY"`,
  },
];

const audience: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { StackEmails } from "stackemails";
const stack = new StackEmails("se_live_...");

const segment = await stack.segments.create({ name: "Newsletter" });
await stack.contacts.create({
  email: "ada@example.com",
  firstName: "Ada",
  properties: { plan: "pro" },
  segmentIds: [segment.id],
});`,
  },
  {
    lang: "cURL",
    code: `curl -X POST ${API_BASE}/contacts \\
  -H "Authorization: Bearer se_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "ada@example.com", "first_name": "Ada" }'`,
  },
];

const broadcasts: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { StackEmails } from "stackemails";
const stack = new StackEmails("se_live_...");

await stack.broadcasts.create({
  segmentId: "SEGMENT_ID",
  from: "Acme <news@acme.com>",
  subject: "What's new, {{first_name}}",
  html: "<h1>Hi {{first_name}}</h1><p><a href=\\"{{unsubscribe_url}}\\">Unsubscribe</a></p>",
  send: true,
});`,
  },
];

const webhooks: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { verifyWebhook } from "stackemails";

export async function POST(req: Request) {
  const raw = await req.text();
  const ok = await verifyWebhook(raw, req.headers.get("x-stackemails-signature-v2"), process.env.STACKEMAILS_WEBHOOK_SECRET!);
  if (!ok) return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(raw); // { id, type, created_at, data }
  return new Response("ok");
}`,
  },
  {
    lang: "Python",
    code: `import hmac, hashlib, time

def verify(raw: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    t = int(parts["t"])
    if abs(time.time() - t) > 300:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])`,
  },
];

const events: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { StackEmails } from "stackemails";
const stack = new StackEmails("se_live_...");

await stack.events.send({ name: "user.signed_up", email: "ada@example.com", data: { plan: "pro" } });`,
  },
];

export const CODE_SNIPPETS: Record<string, Snippet[]> = {
  emails: sendEmailSnippets(),
  domains,
  "api-keys": apiKeys,
  audience,
  broadcasts,
  webhooks,
  events,
};
