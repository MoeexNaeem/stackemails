# NanoSend

A developer-first **email delivery platform** — a Resend-style transactional & marketing email API built on **Next.js + MongoDB**, designed to sit on top of **Amazon SES** in production.

It ships with a clean REST API, API-key auth, automated domain authentication (SPF/DKIM/DMARC), real-time signed webhooks, a queue-based delivery pipeline, and a full multi-tenant dashboard.

> **Runs with zero external infrastructure.** Out of the box it uses an in-process MongoDB, an in-process job queue, and a mock email provider — so `npm install && npm run dev` gives you a fully working product. Flip a few env vars to switch to real MongoDB, Redis/BullMQ, and Amazon SES.

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. On first boot a demo workspace is seeded automatically:

- **Login:** `demo@nanosend.dev` / `password123`
- A verified domain (`acme.com`), an API key, and sample emails are created for you.
- The demo API key is printed to the server console on first boot.

That's it — no database, Redis, or AWS account required to explore the whole product.

---

## What's inside

| Feature | Status |
| --- | --- |
| REST API (`/v1/emails`, `/v1/domains`) | ✅ |
| API-key auth (`ns_live_…`, SHA-256 hashed, shown once) | ✅ |
| Idempotency keys | ✅ |
| Sliding-window rate limiting | ✅ |
| Queue-based async delivery + retries | ✅ |
| Automated domain auth (SPF + DKIM + DMARC records) | ✅ |
| Real-time HMAC-signed webhooks | ✅ |
| Multi-tenant workspaces (per-tenant isolation) | ✅ |
| 30-day log retention (TTL indexes) | ✅ |
| Full dashboard (overview, emails, domains, keys, webhooks, settings) | ✅ |
| Amazon SES adapter + SNS event receiver | ✅ |
| BullMQ worker | ✅ |

---

## Architecture

The design decouples **ingestion** from **delivery** through a queue, so the API responds in
single-digit milliseconds regardless of provider latency.

```
Client → POST /v1/emails → [validate + auth + rate-limit + quota]
        → write EmailLog(status=queued) → enqueue job → 202 Accepted

Queue worker → provider.send() (SES) → update EmailLog(status=sent, awsMessageId)
             → emit webhook events

Amazon SNS → POST /api/webhooks/ses → correlate by messageId
           → update status (delivered/bounced/complained) → emit webhook events
```

Every persistence, queue, email, and rate-limit concern is behind an interface with a
**local default** and a **production adapter**:

| Concern | Local default | Production (env) |
| --- | --- | --- |
| Database | `mongodb-memory-server` (persisted to `./.mongo-data`) | `MONGODB_URI` (Atlas / self-hosted) |
| Queue | in-process (`QUEUE_DRIVER=memory`) | `QUEUE_DRIVER=bullmq` + Redis worker |
| Email | mock (`EMAIL_PROVIDER=mock`) | `EMAIL_PROVIDER=ses` |
| Rate limit | in-process (`RATE_LIMIT_DRIVER=memory`) | `RATE_LIMIT_DRIVER=redis` |

See [`.env.example`](.env.example) for all options.

---

## API

Base URL: `/v1`. Authenticate with `Authorization: Bearer ns_live_…`.

**Send an email**

```bash
curl -X POST http://localhost:3000/v1/emails \
  -H "Authorization: Bearer ns_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "from": "Acme <hello@acme.com>",
    "to": ["user@example.com"],
    "subject": "Welcome to our platform",
    "html": "<h1>Welcome</h1>"
  }'
# → 202 { "id": "msg_9f8e7d6c", "status": "queued" }
```

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/emails` | Queue an email (202). |
| `GET` | `/v1/emails` | List recent emails. |
| `GET` | `/v1/emails/:id` | Retrieve an email + event timeline. |
| `POST` | `/v1/domains` | Register a domain; returns DNS records. |
| `GET` | `/v1/domains` | List domains. |
| `POST` | `/v1/domains/:id/verify` | Re-check verification with SES. |
| `POST` | `/v1/audiences` | Create an audience. |
| `GET` | `/v1/audiences` | List audiences with contact counts. |
| `POST` | `/v1/audiences/:id/contacts` | Add a contact to an audience. |
| `GET` | `/v1/audiences/:id/contacts` | List contacts in an audience. |
| `POST` | `/v1/broadcasts` | Queue an email to a whole audience. |

Full reference: **http://localhost:3000/docs**

## Typed SDK

A publishable TypeScript client lives in [`packages/nanosend`](packages/nanosend) (`npm run build` there emits `dist/`). It wraps every endpoint with full types and supports **React Email** natively — pass a component and it renders to HTML before sending:

```ts
import { NanoSend } from "nanosend";
import { WelcomeEmail } from "./emails/WelcomeEmail";

const ns = new NanoSend("ns_live_...");

await ns.emails.send({
  from: "Acme <hello@acme.com>",
  to: "user@example.com",
  subject: "Welcome 👋",
  react: <WelcomeEmail name="Ada" product="Acme" />, // rendered to HTML
});

// Marketing
const audience = await ns.audiences.create({ name: "Newsletter" });
await ns.audiences.addContact(audience.id, { email: "a@example.com" });
await ns.broadcasts.send({ audienceId: audience.id, from: "...", subject: "...", html: "..." });
```

Resources: `ns.emails`, `ns.domains`, `ns.audiences`, `ns.broadcasts`. Errors throw a typed `NanoSendError` with `.status` and `.code`.

## React Email

Author templates as React components in [`src/emails/`](src/emails) using `@react-email/components`. The dashboard **Templates** page shows a live server-rendered preview, and `renderEmail(<WelcomeEmail/>)` turns any template into an HTML string.

---

## Security

- **API keys** are `ns_live_<32 random bytes>`; only a salted SHA-256 hash is stored, and the raw
  key is shown exactly once.
- **Webhooks** are signed: `X-NanoSend-Signature: sha256=HMAC-SHA256(body, workspace_secret)`.
- **Tenant isolation**: every query is scoped by `workspaceId`.
- Passwords are hashed with bcrypt; sessions are opaque, httpOnly, hashed at rest.

---

## Going to production

1. **MongoDB** — set `MONGODB_URI` to an Atlas or self-hosted cluster.
2. **Amazon SES** — set `EMAIL_PROVIDER=ses` and AWS credentials. Add domains via the dashboard,
   publish the generated DNS records, and click Verify.
3. **SES events** — point an SES Configuration Set → SNS topic at `/api/webhooks/ses`.
4. **Queue** — set `QUEUE_DRIVER=bullmq`, provide `REDIS_URL`, and run the worker:
   ```bash
   npm run worker
   ```
5. **Rate limits** — set `RATE_LIMIT_DRIVER=redis` to share limits across instances.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the app (auto-seeds demo data only in local memory-server mode). |
| `npm run dev:all` | Start the app **and** the BullMQ worker together (use when `QUEUE_DRIVER=bullmq`). |
| `npm run worker` | Run the BullMQ delivery worker on its own. |
| `npm run verify` | Check connectivity to MongoDB, Redis, and SES from your `.env` (read-only). |
| `npm run seed` | Manually seed demo data (needed once when using a real `MONGODB_URI`). |
| `npm run build` / `npm start` | Production build / serve. |
| `npm run typecheck` | TypeScript check. |

> **When `QUEUE_DRIVER=bullmq`**, the web app only *enqueues* — a worker must be running to actually send, or emails stay `queued`. Use `npm run dev:all`, or run `npm run dev` and `npm run worker` in two terminals.

---

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Mongoose · Zod · BullMQ · AWS SDK v3 (SESv2 + SNS).
