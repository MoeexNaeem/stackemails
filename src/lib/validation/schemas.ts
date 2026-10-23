import { z } from "zod";

const emailList = z.union([z.string(), z.array(z.string())]).transform((v) =>
  (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean),
);

/** POST /v1/emails body. `from`, `to`, `subject` + at least one of html/text. */
export const sendEmailSchema = z
  .object({
    from: z.string().min(3).max(320),
    to: emailList,
    cc: emailList.optional(),
    bcc: emailList.optional(),
    reply_to: emailList.optional(),
    subject: z.string().min(1).max(998),
    html: z.string().max(5_000_000).optional(),
    text: z.string().max(5_000_000).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    attachments: z
      .array(z.object({ filename: z.string().min(1).max(200), content: z.string(), content_type: z.string().max(200).optional() }))
      .max(20)
      .optional(),
    tags: z
      .array(z.object({ name: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "Tag names may contain only letters, numbers, _ and -"), value: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, "Tag values may contain only letters, numbers, _ and -") }))
      .max(10)
      .optional(),
    scheduled_at: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => d.to.length > 0, { message: "`to` must contain at least one recipient" })
  .refine((d) => Boolean(d.html || d.text), {
    message: "Provide `html` and/or `text` content",
  });

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

/** POST /v1/domains body. */
export const createDomainSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, "Enter a valid domain, e.g. mail.acme.com"),
  region: z.string().default("us-east-1"),
  returnPath: z.string().trim().default("send"),
  trackingSubdomain: z.string().trim().default(""),
  clickTracking: z.coerce.boolean().default(true),
  openTracking: z.coerce.boolean().default(false),
});

/** Dashboard: create API key. */
export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  mode: z.enum(["live", "test"]).default("live"),
  permission: z.enum(["full_access", "sending_access"]).default("full_access"),
  domainScope: z.string().default("all"),
});

/** Dashboard: create webhook. */
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default([]),
});

/** Audiences & contacts. */
export const createAudienceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const createContactSchema = z.object({
  email: z.string().email().toLowerCase(),
  first_name: z.string().trim().max(120).optional(),
  last_name: z.string().trim().max(120).optional(),
});

export const createBroadcastSchema = z
  .object({
    audience_id: z.string().min(1),
    from: z.string().min(3),
    subject: z.string().min(1).max(998),
    html: z.string().optional(),
    text: z.string().optional(),
  })
  .refine((d) => Boolean(d.html || d.text), {
    message: "Provide `html` and/or `text` content",
  });

/** Auth. */
export const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(200),
  workspaceName: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, "This reset link is invalid."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});
