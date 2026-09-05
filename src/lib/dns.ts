export interface DnsRecordSpec {
  type: "TXT" | "CNAME" | "MX";
  name: string;
  value: string;
  purpose: "SPF" | "DKIM" | "DMARC" | "MX" | "verification";
  status: "pending" | "verified" | "failed";
}

/**
 * Build the set of DNS records a customer must publish to authenticate their
 * domain with SES-backed sending: 3 DKIM CNAMEs, an SPF include, and a
 * starter DMARC policy. Mirrors what SES delegated auth expects.
 */
export function buildDnsRecords(domain: string, dkimTokens: string[]): DnsRecordSpec[] {
  const records: DnsRecordSpec[] = [];

  // DKIM — three CNAMEs pointing at Amazon SES.
  for (const token of dkimTokens) {
    records.push({
      type: "CNAME",
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      purpose: "DKIM",
      status: "pending",
    });
  }

  // SPF — authorise Amazon SES to send for the domain.
  records.push({
    type: "TXT",
    name: domain,
    value: "v=spf1 include:amazonses.com ~all",
    purpose: "SPF",
    status: "pending",
  });

  // DMARC — starter monitoring policy.
  records.push({
    type: "TXT",
    name: `_dmarc.${domain}`,
    value: "v=DMARC1; p=none;",
    purpose: "DMARC",
    status: "pending",
  });

  return records;
}
