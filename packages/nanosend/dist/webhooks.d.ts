/**
 * Verify a Stack Emails webhook (X-StackEmails-Signature-V2: t=…,v1=…).
 * Uses Web Crypto, so it works in Node 18+, Bun, Deno and edge runtimes.
 *
 * ```ts
 * const ok = await verifyWebhook(rawBody, req.headers.get("x-stackemails-signature-v2"), process.env.STACKEMAILS_WEBHOOK_SECRET);
 * ```
 */
export declare function verifyWebhook(rawBody: string, header: string | null | undefined, secret: string, toleranceSeconds?: number): Promise<boolean>;
