import { apiError, apiJson } from "@/lib/api/response";
import { getRateLimiter } from "@/lib/ratelimit";
import { checkDkim, checkDmarc, checkMx, checkSpf, cleanDomain } from "@/lib/dns-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public endpoint behind the free tools at /tools/* (SPF, DMARC, DKIM, MX). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const domain = cleanDomain(url.searchParams.get("domain") ?? "");
  if (!domain) return apiError(422, "invalid_domain", "Enter a valid domain name, such as example.com.");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await getRateLimiter().check(`tools:dns:${ip}`, 40, 60_000);
  if (!rl.allowed) return apiError(429, "rate_limited", "Too many lookups. Wait a minute and try again.");

  try {
    switch (type) {
      case "spf":
        return apiJson(await checkSpf(domain));
      case "dmarc":
        return apiJson(await checkDmarc(domain));
      case "mx":
        return apiJson(await checkMx(domain));
      case "dkim": {
        const sel = (url.searchParams.get("selector") ?? "").trim().toLowerCase();
        if (sel && !/^[a-z0-9._-]{1,63}$/.test(sel)) return apiError(422, "invalid_selector", "Selectors contain only letters, numbers, dots, dashes and underscores.");
        return apiJson(await checkDkim(domain, sel || undefined));
      }
      default:
        return apiError(422, "invalid_type", "type must be spf, dmarc, dkim or mx.");
    }
  } catch (err) {
    console.error("[tools/dns]", type, domain, (err as Error).message);
    return apiError(502, "dns_error", "The DNS lookup failed or timed out. Try again in a moment.");
  }
}
