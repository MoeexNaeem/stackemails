/**
 * Plain abuse rules (no server-only imports) so standalone scripts can use them too.
 * Runtime enforcement lives in lib/abuse.ts.
 */
// Disposable / throwaway inbox providers. Subdomains match too (x.netflows.us).
const DISPOSABLE = new Set([
  "netflows.us", "shipwith.us", "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com",
  "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "temp-mail.io", "yopmail.com", "yopmail.net",
  "getnada.com", "nada.email", "trashmail.com", "trashmail.de", "dispostable.com", "maildrop.cc", "throwawaymail.com", "mohmal.com",
  "emailondeck.com", "moakt.com", "tempr.email", "mail.tm", "mailto.plus", "fexpost.com", "fexbox.org", "mailbox.in.ua", "spamgourmet.com",
  "mintemail.com", "mytemp.email", "tmpmail.org", "tmpmail.net", "tmail.ws", "burnermail.io", "inboxkitten.com", "getairmail.com",
  "emailfake.com", "fakeinbox.com", "fakemail.net", "luxusmail.org", "dropmail.me", "10mail.org", "spambox.us", "mailnesia.com",
  "mailcatch.com", "byom.de", "einrot.com", "cuvox.de", "armyspy.com", "dayrep.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us", "mvrht.net", "harakirimail.com", "anonbox.net", "mailpoof.com", "33mail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = String(email).toLowerCase().split("@")[1] ?? "";
  const parts = domain.split(".");
  for (let i = 0; i <= parts.length - 2; i++) if (DISPOSABLE.has(parts.slice(i).join("."))) return true;
  return false;
}

/** Free accounts: how many teams one person may own, and domains across all their teams. */
export const FREE_MAX_OWNED_TEAMS = 2;
export const FREE_MAX_DOMAINS_PER_OWNER = 2;

/**
 * True when text looks like it carries a link or domain name. Spammers put
 * links in their name or team name so it appears inside our system emails
 * (invites, notices); those fields must never carry one.
 */
export function containsLink(text: string): boolean {
  return /:\/\/|www\.|\b[a-z0-9-]+\.[a-z]{2,}\b/i.test(String(text ?? ""));
}
