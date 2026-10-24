"use server";

import { createElement } from "react";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import { ContactMessage } from "@/lib/db/models";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";
import { env } from "@/lib/env";

export type ContactState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> } | null;

const schema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  company: z.string().trim().max(160).optional().default(""),
  topic: z.enum(["sales", "support", "partnership", "press", "other"]).default("sales"),
  volume: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(10, "Please add a little more detail (10+ characters).").max(5000),
});

/**
 * Public contact form. Stored for the admin inbox and forwarded to the
 * support address. No auto-reply is sent to the submitted address - that
 * would let anyone use the form to email arbitrary people.
 */
export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real users never fill the hidden "website" field.
  if (String(formData.get("website") ?? "")) return { ok: true };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, fieldErrors };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = await getRateLimiter().check(`contact:${ip}`, 5, 3_600_000);
  if (!rl.allowed) return { ok: false, error: "Too many messages from your network. Please try again later or email us directly." };

  await connectToDatabase();
  const m = parsed.data;
  const doc = await ContactMessage.create({ ...m, ip });

  after(() =>
    sendSystemEmail({
      kind: "contact_form",
      to: env.supportEmail,
      subject: `[Contact · ${m.topic}] ${m.name}${m.company ? ` (${m.company})` : ""}`,
      react: createElement(NoticeEmail, {
        heading: `New ${m.topic} enquiry`,
        paragraphs: [`From: ${m.name} <${m.email}>${m.company ? ` · ${m.company}` : ""}${m.volume ? ` · Volume: ${m.volume}` : ""}`, m.message],
        cta: { label: "Open in admin", href: `${env.appUrl}/admin/messages?id=${doc._id}` },
      }),
    }),
  );

  return { ok: true };
}
