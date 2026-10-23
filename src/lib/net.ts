import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/** True for loopback, private, link-local, CGNAT, multicast, reserved and metadata ranges. */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

/**
 * Validate an outbound URL we will call on a customer's behalf (webhooks).
 * HTTPS only in production, no credentials in the URL, and every resolved
 * address must be public — blocks SSRF into internal networks and metadata.
 */
export async function assertPublicUrl(raw: string): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Enter a valid URL." };
  }
  const allowHttp = process.env.NODE_ENV !== "production";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) return { ok: false, reason: "Webhook URLs must use https://." };
  if (url.username || url.password) return { ok: false, reason: "URLs can't contain credentials." };
  if (url.port && !["443", "80", "8443"].includes(url.port) && process.env.NODE_ENV === "production") return { ok: false, reason: "Use a standard port (443)." };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) {
    return allowHttp ? { ok: true, url } : { ok: false, reason: "Internal hostnames aren't allowed." };
  }
  let addrs: string[];
  try {
    addrs = isIP(host) ? [host] : (await dns.lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  } catch {
    return { ok: false, reason: "That hostname doesn't resolve." };
  }
  if (!addrs.length) return { ok: false, reason: "That hostname doesn't resolve." };
  if (addrs.some(isPrivateIp) && !allowHttp) return { ok: false, reason: "Webhook URLs must point to a public address." };
  return { ok: true, url };
}
