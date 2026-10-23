export interface DnsRecordSpec {
  type: "TXT" | "CNAME" | "MX";
  name: string;
  value: string;
  priority?: number;
  purpose: "SPF" | "DKIM" | "DMARC" | "MX" | "verification";
  status: "pending" | "verified" | "failed";
}

/**
 * DNS records a customer publishes to authenticate a domain with SES-backed
 * sending (same model Resend uses):
 *  - DKIM: 3 CNAMEs → *.dkim.amazonses.com (Easy DKIM, 2048-bit)
 *  - SPF on a dedicated MAIL FROM subdomain ("send.<domain>"): an MX for
 *    bounce feedback + a TXT include — so it never clashes with the root SPF
 *  - DMARC: starter monitoring policy (customers can tighten to quarantine/reject)
 *  - Receiving (optional): root MX → SES inbound endpoint
 */
export function buildDnsRecords(
  domain: string,
  dkimTokens: string[],
  opts: { region?: string; returnPath?: string; receiving?: boolean } = {},
): DnsRecordSpec[] {
  const region = opts.region || "us-east-1";
  const mailFrom = `${(opts.returnPath || "send").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "send"}.${domain}`;
  const records: DnsRecordSpec[] = dkimTokens.map((token) => ({
    type: "CNAME",
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: "DKIM",
    status: "pending",
  }));

  records.push(
    { type: "MX", name: mailFrom, value: `feedback-smtp.${region}.amazonses.com`, priority: 10, purpose: "SPF", status: "pending" },
    { type: "TXT", name: mailFrom, value: "v=spf1 include:amazonses.com ~all", purpose: "SPF", status: "pending" },
    { type: "TXT", name: `_dmarc.${domain}`, value: "v=DMARC1; p=none;", purpose: "DMARC", status: "pending" },
  );

  if (opts.receiving) {
    records.push({ type: "MX", name: domain, value: `inbound-smtp.${region}.amazonaws.com`, priority: 10, purpose: "MX", status: "pending" });
  }
  return records;
}

export function mailFromDomain(domain: string, returnPath?: string) {
  return `${(returnPath || "send").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "send"}.${domain}`;
}
