import "server-only";
import { Resolver } from "node:dns/promises";
import { createPublicKey } from "node:crypto";

/** DNS checks behind the free tools at /tools/*. Results are plain JSON for the client. */

const resolver = new Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

export type Finding = { level: "ok" | "warn" | "error" | "info"; text: string };

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/i;

export function cleanDomain(input: string): string | null {
  let d = String(input ?? "").trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "").replace(/^.*@/, "").split(/[/?#:]/)[0].replace(/\.$/, "");
  return DOMAIN_RE.test(d) ? d : null;
}

async function txt(name: string): Promise<string[] | null> {
  try {
    return (await resolver.resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return null;
    throw err;
  }
}

/* ---------------------------------- SPF ---------------------------------- */

const LOOKUP_MECHS = new Set(["include", "a", "mx", "ptr", "exists", "redirect"]);

type SpfNode = { domain: string; record: string | null; lookups: number; children: SpfNode[]; error?: string };

async function walkSpf(domain: string, depth: number, seen: Set<string>): Promise<SpfNode> {
  const node: SpfNode = { domain, record: null, lookups: 0, children: [] };
  if (seen.has(domain)) return { ...node, error: "Loop: this domain is included more than once" };
  seen.add(domain);
  const records = (await txt(domain))?.filter((r) => /^v=spf1(\s|$)/i.test(r)) ?? [];
  if (!records.length) return { ...node, error: "No SPF record found" };
  if (records.length > 1) node.error = "More than one SPF record";
  node.record = records[0];
  for (const term of records[0].split(/\s+/).slice(1)) {
    const m = term.match(/^[+\-~?]?([a-z0-9]+)(?:[:=](.+))?$/i);
    if (!m) continue;
    const mech = m[1].toLowerCase();
    if (!LOOKUP_MECHS.has(mech)) continue;
    node.lookups++;
    if ((mech === "include" || mech === "redirect") && m[2] && depth < 6) {
      const child = await walkSpf(m[2].toLowerCase(), depth + 1, seen);
      node.children.push(child);
    }
  }
  return node;
}

const totalLookups = (n: SpfNode): number => n.lookups + n.children.reduce((s, c) => s + totalLookups(c), 0);

export async function checkSpf(domain: string) {
  const all = await txt(domain);
  const spf = all?.filter((r) => /^v=spf1(\s|$)/i.test(r)) ?? [];
  const findings: Finding[] = [];
  if (!spf.length) {
    findings.push({ level: "error", text: "No SPF record found. Receivers can't tell which servers may send for this domain." });
    return { domain, record: null, lookups: 0, tree: null, mechanisms: [], findings };
  }
  if (spf.length > 1) findings.push({ level: "error", text: `Found ${spf.length} SPF records. A domain must have exactly one, otherwise SPF returns permerror. Merge them into one record.` });
  const record = spf[0];
  const tree = await walkSpf(domain, 0, new Set());
  const lookups = totalLookups(tree);
  const terms = record.split(/\s+/).slice(1);
  const allTerm = terms.find((t) => /^[+\-~?]?all$/i.test(t));

  if (lookups > 10) findings.push({ level: "error", text: `${lookups} DNS lookups. SPF allows at most 10, so this record fails with permerror. Remove unused includes or flatten some of them.` });
  else if (lookups >= 8) findings.push({ level: "warn", text: `${lookups} of 10 DNS lookups used. Adding another sender may push you over the limit.` });
  else findings.push({ level: "ok", text: `${lookups} of 10 DNS lookups used.` });

  if (!allTerm && !terms.some((t) => /^redirect=/i.test(t))) findings.push({ level: "warn", text: "No 'all' mechanism at the end. Add ~all (soft fail) or -all (hard fail)." });
  else if (allTerm === "+all" || allTerm === "all") findings.push({ level: "error", text: "'+all' lets any server on the internet send as this domain. Use ~all or -all." });
  else if (allTerm === "?all") findings.push({ level: "warn", text: "'?all' is neutral and gives receivers no guidance. Use ~all or -all." });
  else if (allTerm === "-all") findings.push({ level: "ok", text: "Ends with -all: mail from unlisted servers should be rejected." });
  else if (allTerm === "~all") findings.push({ level: "ok", text: "Ends with ~all: mail from unlisted servers is treated as suspicious (soft fail)." });
  if (terms.some((t) => /^[+\-~?]?ptr/i.test(t))) findings.push({ level: "warn", text: "The ptr mechanism is slow and deprecated (RFC 7208). Replace it with ip4/ip6 or include." });
  if (record.length > 450) findings.push({ level: "info", text: `The record is ${record.length} characters long; very long records can be truncated by some DNS providers.` });
  const broken = flatErrors(tree).filter((e) => e.domain !== domain);
  for (const b of broken) findings.push({ level: "error", text: `include:${b.domain}: ${b.error}.` });

  return { domain, record, lookups, tree, mechanisms: terms, findings };
}

function flatErrors(n: SpfNode): SpfNode[] {
  return [...(n.error ? [n] : []), ...n.children.flatMap(flatErrors)];
}

/* --------------------------------- DMARC --------------------------------- */

export function parseTags(record: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of record.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

export async function checkDmarc(domain: string) {
  const findings: Finding[] = [];
  let source = domain;
  let records = (await txt(`_dmarc.${domain}`))?.filter((r) => /^v=DMARC1/i.test(r)) ?? [];
  // Fall back to the parent (organisational) domain, which receivers also do.
  const labels = domain.split(".");
  if (!records.length && labels.length > 2) {
    const parent = labels.slice(-2).join(".");
    const p = (await txt(`_dmarc.${parent}`))?.filter((r) => /^v=DMARC1/i.test(r)) ?? [];
    if (p.length) {
      records = p;
      source = parent;
      findings.push({ level: "info", text: `No record at _dmarc.${domain}; receivers use the organisational domain's record at _dmarc.${parent}.` });
    }
  }
  if (!records.length) {
    findings.push({ level: "error", text: `No DMARC record at _dmarc.${domain}. Gmail and Yahoo require one from bulk senders. Start with p=none and a rua address.` });
    return { domain, source, record: null, tags: {}, findings };
  }
  if (records.length > 1) findings.push({ level: "error", text: "More than one DMARC record. Receivers ignore DMARC entirely when there are several." });
  const record = records[0];
  const tags = parseTags(record);
  const p = tags.p?.toLowerCase();
  if (!p) findings.push({ level: "error", text: "Missing the required p= policy tag." });
  else if (p === "none") findings.push({ level: "warn", text: "Policy p=none only monitors. Once reports show all your senders pass, move to quarantine and then reject." });
  else if (p === "quarantine") findings.push({ level: "ok", text: "Policy p=quarantine: failing mail goes to spam." });
  else if (p === "reject") findings.push({ level: "ok", text: "Policy p=reject: failing mail is rejected. This is the strongest protection." });
  else findings.push({ level: "error", text: `Unknown policy p=${p}. Use none, quarantine or reject.` });
  if (!tags.rua) findings.push({ level: "warn", text: "No rua= address, so you won't receive aggregate reports showing who sends as your domain." });
  else findings.push({ level: "ok", text: `Aggregate reports go to ${tags.rua}.` });
  if (tags.pct && tags.pct !== "100") findings.push({ level: "info", text: `pct=${tags.pct}: the policy applies to only ${tags.pct}% of failing mail.` });
  if (tags.sp) findings.push({ level: "info", text: `Subdomain policy sp=${tags.sp}.` });
  return { domain, source, record, tags, findings };
}

/* ---------------------------------- DKIM --------------------------------- */

export const COMMON_SELECTORS = ["google", "selector1", "selector2", "default", "s1", "s2", "k1", "k2", "dkim", "mail", "smtp", "mx", "resend", "sendgrid", "s1024", "everlytickey1", "mandrill", "pm", "zoho", "protonmail", "fm1"];

function keyBits(p: string): number | null {
  try {
    const key = createPublicKey({ key: Buffer.from(p, "base64"), format: "der", type: "spki" });
    return key.asymmetricKeyDetails?.modulusLength ?? null;
  } catch {
    return null;
  }
}

async function dkimAt(domain: string, selector: string) {
  const name = `${selector}._domainkey.${domain}`;
  const rec = (await txt(name))?.find((r) => /p=/i.test(r) || /v=DKIM1/i.test(r));
  if (!rec) return null;
  const tags = parseTags(rec);
  const findings: Finding[] = [];
  const kType = (tags.k ?? "rsa").toLowerCase();
  if (!tags.p) findings.push({ level: "error", text: "The record has an empty p= tag, which means this key has been revoked." });
  else if (kType === "rsa") {
    const bits = keyBits(tags.p.replace(/\s+/g, ""));
    if (!bits) findings.push({ level: "error", text: "The public key in p= isn't a valid RSA key. Check that it was copied completely." });
    else if (bits < 1024) findings.push({ level: "error", text: `${bits}-bit key. Receivers reject keys shorter than 1024 bits.` });
    else if (bits < 2048) findings.push({ level: "warn", text: `${bits}-bit RSA key. It works, but 2048-bit keys are recommended.` });
    else findings.push({ level: "ok", text: `${bits}-bit RSA key.` });
  } else findings.push({ level: "ok", text: `${kType} key published.` });
  if (tags.t?.includes("y")) findings.push({ level: "info", text: "t=y: the domain says it is testing DKIM; some receivers treat failures leniently." });
  return { selector, name, record: rec, tags, findings };
}

export async function checkDkim(domain: string, selector?: string) {
  if (selector) {
    const r = await dkimAt(domain, selector);
    return { domain, results: r ? [r] : [], scanned: [selector] };
  }
  const found = (await Promise.all(COMMON_SELECTORS.map((s) => dkimAt(domain, s).catch(() => null)))).filter(Boolean);
  return { domain, results: found, scanned: COMMON_SELECTORS };
}

/* ----------------------------------- MX ---------------------------------- */

const MX_PROVIDERS: [RegExp, string][] = [
  [/google\.com$|googlemail\.com$/i, "Google Workspace / Gmail"],
  [/outlook\.com$|protection\.outlook\.com$/i, "Microsoft 365"],
  [/zoho\./i, "Zoho Mail"],
  [/protonmail\.ch$/i, "Proton Mail"],
  [/messagingengine\.com$/i, "Fastmail"],
  [/mail\.me\.com$|icloud\.com$/i, "iCloud Mail"],
  [/amazonaws\.com$/i, "Amazon SES"],
  [/secureserver\.net$/i, "GoDaddy"],
  [/privateemail\.com$/i, "Namecheap Private Email"],
  [/mimecast\./i, "Mimecast"],
  [/pphosted\.com$/i, "Proofpoint"],
  [/hostinger\./i, "Hostinger"],
  [/yahoodns\.net$/i, "Yahoo"],
];

export async function checkMx(domain: string) {
  const findings: Finding[] = [];
  let records: { exchange: string; priority: number; provider?: string }[] = [];
  try {
    records = (await resolver.resolveMx(domain)).sort((a, b) => a.priority - b.priority).map((r) => ({ ...r, provider: MX_PROVIDERS.find(([re]) => re.test(r.exchange))?.[1] }));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ENOTFOUND" && code !== "ENODATA") throw err;
  }
  if (!records.length) findings.push({ level: "warn", text: "No MX records. This domain can't receive email (senders may fall back to its A record)." });
  else if (records.length === 1 && records[0].exchange === "") findings.push({ level: "info", text: "Null MX (RFC 7505): this domain explicitly accepts no email." });
  else {
    findings.push({ level: "ok", text: `${records.length} mail server${records.length > 1 ? "s" : ""} found.` });
    const provider = records.find((r) => r.provider)?.provider;
    if (provider) findings.push({ level: "info", text: `Mail appears to be hosted by ${provider}.` });
    if (records.length === 1) findings.push({ level: "info", text: "Only one MX record. Large providers handle redundancy behind one name, but self-hosted mail should have a backup." });
  }
  return { domain, records, findings };
}
