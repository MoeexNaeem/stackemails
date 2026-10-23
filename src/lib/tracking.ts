import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Open & click tracking. Opens use a 1×1 pixel; clicks go through a signed
 * redirect (the HMAC stops the endpoint being abused as an open redirect).
 */
function sign(emailId: string, url: string): string {
  return createHmac("sha256", env.sessionSecret).update(`click:${emailId}:${url}`).digest("base64url").slice(0, 22);
}

export function verifyClick(emailId: string, url: string, s: string): boolean {
  const a = Buffer.from(String(s ?? ""));
  const b = Buffer.from(sign(emailId, url));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function openPixelUrl(emailId: string) {
  return `${env.appUrl}/api/t/o/${emailId}`;
}

export function clickUrl(emailId: string, url: string) {
  return `${env.appUrl}/api/t/c/${emailId}?u=${encodeURIComponent(url)}&s=${sign(emailId, url)}`;
}

/** Rewrite http(s) links (skipping unsubscribe + mailto/tel/anchors) and/or append the open pixel. */
export function applyTracking(html: string, emailId: string, opts: { opens: boolean; clicks: boolean }): string {
  let out = html;
  if (opts.clicks) {
    out = out.replace(/(<a\b[^>]*?\shref\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi, (m, pre: string, q: string, url: string) => {
      if (/\/u\/|\/api\/u\/|unsubscribe/i.test(url)) return m;
      return `${pre}${q}${clickUrl(emailId, url.replace(/&amp;/g, "&"))}${q}`;
    });
  }
  if (opts.opens) {
    const pixel = `<img src="${openPixelUrl(emailId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${pixel}</body>`) : out + pixel;
  }
  return out;
}
