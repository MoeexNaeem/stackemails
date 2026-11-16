/**
 * The visitor's real IP address behind our nginx proxy.
 *
 * Never trust the FIRST X-Forwarded-For entry: a client can send its own
 * X-Forwarded-For header and nginx appends the real address after it, so the
 * first entry is whatever the attacker typed (that let rate limits be dodged).
 * nginx sets X-Real-IP to the connecting address, which can't be forged; the
 * LAST X-Forwarded-For entry is the fallback.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
