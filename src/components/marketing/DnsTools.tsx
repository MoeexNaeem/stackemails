"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, Spinner, type IconName } from "@/components/ui/Icon";

type Finding = { level: "ok" | "warn" | "error" | "info"; text: string };
type Kind = "spf" | "dmarc" | "dkim" | "mx";

const LEVEL: Record<Finding["level"], { icon: IconName; color: string; label: string }> = {
  ok: { icon: "check", color: "#16a34a", label: "Pass" },
  warn: { icon: "alert", color: "#d97706", label: "Warning" },
  error: { icon: "x", color: "#dc2626", label: "Problem" },
  info: { icon: "sparkle", color: "var(--m-accent)", label: "Note" },
};

function Findings({ items }: { items: Finding[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((f, i) => (
        <li key={i} className="flex gap-3 rounded-[14px] border px-4 py-3 text-[14.5px]" style={{ borderColor: "var(--m-line)", color: "var(--m-text)" }}>
          <Icon name={LEVEL[f.level].icon} size={17} className="mt-[2px] shrink-0" style={{ color: LEVEL[f.level].color }} label={LEVEL[f.level].label} />
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

function RecordBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[16px] border" style={{ borderColor: "#262a30", background: "#15171a" }}>
      <div className="flex items-center justify-between border-b px-4 py-2 text-[12px]" style={{ borderColor: "#262a30", color: "#94a3b8" }}>
        <span className="truncate">{label}</span>
        <button
          type="button"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-white"
          onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          <Icon name={copied ? "check" : "layers"} size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-[13px] leading-relaxed" style={{ color: "#e5e7eb", fontFamily: "var(--font-mono)" }}>{value}</pre>
    </div>
  );
}

const PLACEHOLDER: Record<Kind, string> = { spf: "example.com", dmarc: "example.com", dkim: "example.com", mx: "example.com" };

/** Domain lookup tool backed by /api/tools/dns. Reads ?domain= so results are linkable. */
export function DnsChecker({ kind }: { kind: Kind }) {
  const [domain, setDomain] = useState("");
  const [selector, setSelector] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  async function run(d = domain, s = selector) {
    if (!d.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    const q = new URLSearchParams({ type: kind, domain: d.trim() });
    if (kind === "dkim" && s.trim()) q.set("selector", s.trim());
    try {
      const res = await fetch(`/api/tools/dns?${q}`);
      const json = await res.json();
      if (!res.ok) setError(json?.error?.message ?? "Lookup failed.");
      else {
        setData(json);
        const u = new URL(window.location.href);
        u.searchParams.set("domain", json.domain);
        if (kind === "dkim") (s.trim() ? u.searchParams.set("selector", s.trim()) : u.searchParams.delete("selector"));
        window.history.replaceState(null, "", u.toString());
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("domain");
    const s = p.get("selector") ?? "";
    if (d) {
      setDomain(d);
      setSelector(s);
      void run(d, s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-[24px] border p-5 sm:p-6" style={{ borderColor: "var(--m-line)", background: "var(--m-card, var(--m-bg))" }}>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label className="sr-only" htmlFor={`${kind}-domain`}>Domain</label>
        <input
          id={`${kind}-domain`}
          className="m-input h-12 min-w-0 flex-1 rounded-[14px] border px-4 text-[15px] outline-none focus:border-[var(--m-accent)]"
          style={{ borderColor: "var(--m-line)", background: "var(--m-bg)", color: "var(--m-head)" }}
          placeholder={PLACEHOLDER[kind]}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          required
        />
        {kind === "dkim" && (
          <>
            <label className="sr-only" htmlFor="dkim-selector">Selector</label>
            <input
              id="dkim-selector"
              className="h-12 rounded-[14px] border px-4 text-[15px] outline-none focus:border-[var(--m-accent)] sm:w-[180px]"
              style={{ borderColor: "var(--m-line)", background: "var(--m-bg)", color: "var(--m-head)" }}
              placeholder="selector (optional)"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              autoCapitalize="none"
              spellCheck={false}
            />
          </>
        )}
        <button type="submit" className="m-btn m-btn-ink h-12 justify-center px-6" disabled={loading}>
          {loading ? <><Spinner /> Checking</> : <>Check {kind.toUpperCase()}</>}
        </button>
      </form>
      {kind === "dkim" && <p className="mt-2 text-[13px]" style={{ color: "var(--m-faint)" }}>Leave the selector empty to scan {"20+"} common selectors (google, selector1, s1, k1 and more).</p>}

      {error && <p className="mt-5 rounded-[14px] px-4 py-3 text-[14px]" style={{ color: "#dc2626", background: "rgba(220,38,38,0.08)" }}>{error}</p>}

      {data && (
        <div className="mt-6 grid gap-5" aria-live="polite">
          {kind === "spf" && (data.record ? <RecordBox label={`TXT ${data.domain}`} value={data.record} /> : null)}
          {kind === "dmarc" && (data.record ? <RecordBox label={`TXT _dmarc.${data.source}`} value={data.record} /> : null)}
          {kind === "dmarc" && data.record && (
            <div className="overflow-x-auto rounded-[16px] border" style={{ borderColor: "var(--m-line)" }}>
              <table className="w-full text-left text-[14px]">
                <tbody>
                  {Object.entries(data.tags as Record<string, string>).map(([k, v]) => (
                    <tr key={k} className="border-t first:border-t-0" style={{ borderColor: "var(--m-line)" }}>
                      <th className="w-[90px] px-4 py-2.5 font-mono font-medium" style={{ color: "var(--m-muted)" }}>{k}</th>
                      <td className="break-all px-4 py-2.5 font-mono" style={{ color: "var(--m-head)" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kind === "mx" && data.records?.length > 0 && (
            <div className="overflow-x-auto rounded-[16px] border" style={{ borderColor: "var(--m-line)" }}>
              <table className="w-full min-w-[420px] text-left text-[14px]">
                <thead style={{ background: "var(--m-linen)" }}>
                  <tr><th className="px-4 py-2.5 font-semibold" style={{ color: "var(--m-head)" }}>Priority</th><th className="px-4 py-2.5 font-semibold" style={{ color: "var(--m-head)" }}>Mail server</th><th className="px-4 py-2.5 font-semibold" style={{ color: "var(--m-head)" }}>Provider</th></tr>
                </thead>
                <tbody>
                  {data.records.map((r: { priority: number; exchange: string; provider?: string }) => (
                    <tr key={r.exchange + r.priority} className="border-t" style={{ borderColor: "var(--m-line)" }}>
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--m-muted)" }}>{r.priority}</td>
                      <td className="break-all px-4 py-2.5 font-mono" style={{ color: "var(--m-head)" }}>{r.exchange || "(null MX)"}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--m-muted)" }}>{r.provider ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kind === "dkim" &&
            (data.results.length ? (
              data.results.map((r: { selector: string; name: string; record: string; findings: Finding[] }) => (
                <div key={r.selector} className="grid gap-3">
                  <RecordBox label={`TXT ${r.name}`} value={r.record} />
                  <Findings items={r.findings} />
                </div>
              ))
            ) : (
              <Findings items={[{ level: "error", text: data.scanned.length === 1 ? `No DKIM record at ${data.scanned[0]}._domainkey.${data.domain}. Check the selector in a message's DKIM-Signature header (the s= value).` : `No DKIM record found for the ${data.scanned.length} common selectors we tried. Find your selector in a sent message's DKIM-Signature header (s=) and enter it above.` }]} />
            ))}
          {kind !== "dkim" && <Findings items={data.findings} />}
          {kind === "spf" && data.tree?.children?.length > 0 && <SpfTree node={data.tree} />}
        </div>
      )}
    </div>
  );
}

type SpfNode = { domain: string; lookups: number; children: SpfNode[]; error?: string };
function SpfTree({ node }: { node: SpfNode }) {
  return (
    <details className="rounded-[16px] border px-4 py-3" style={{ borderColor: "var(--m-line)" }}>
      <summary className="cursor-pointer text-[14px] font-semibold" style={{ color: "var(--m-head)" }}>Include tree (where the lookups come from)</summary>
      <div className="mt-3 text-[13.5px]" style={{ fontFamily: "var(--font-mono)" }}><TreeRow n={node} depth={0} /></div>
    </details>
  );
}
function TreeRow({ n, depth }: { n: SpfNode; depth: number }) {
  return (
    <>
      <div className="py-0.5" style={{ paddingLeft: depth * 18, color: n.error ? "#dc2626" : "var(--m-text)" }}>
        {depth > 0 ? "└ " : ""}{n.domain} <span style={{ color: "var(--m-faint)" }}>({n.lookups} lookup{n.lookups === 1 ? "" : "s"}{n.error ? `, ${n.error}` : ""})</span>
      </div>
      {n.children.map((c) => <TreeRow key={c.domain + depth} n={c} depth={depth + 1} />)}
    </>
  );
}

/* ------------------------------- Generators ------------------------------ */

const SENDERS: { id: string; label: string; value: string }[] = [
  { id: "stack", label: "Stack Emails / Amazon SES", value: "include:amazonses.com" },
  { id: "google", label: "Google Workspace / Gmail", value: "include:_spf.google.com" },
  { id: "m365", label: "Microsoft 365", value: "include:spf.protection.outlook.com" },
  { id: "zoho", label: "Zoho Mail", value: "include:zoho.com" },
  { id: "sendgrid", label: "SendGrid", value: "include:sendgrid.net" },
  { id: "mailgun", label: "Mailgun", value: "include:mailgun.org" },
  { id: "mailchimp", label: "Mailchimp / Mandrill", value: "include:servers.mcsv.net" },
  { id: "postmark", label: "Postmark", value: "include:spf.mtasv.net" },
  { id: "brevo", label: "Brevo", value: "include:spf.brevo.com" },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-[14px]">
      <span className="font-medium" style={{ color: "var(--m-head)" }}>{label}</span>
      {children}
      {hint && <span className="text-[12.5px]" style={{ color: "var(--m-faint)" }}>{hint}</span>}
    </label>
  );
}
const inputCls = "h-11 rounded-[12px] border px-3.5 text-[14.5px] outline-none focus:border-[var(--m-accent)]";
const inputStyle = { borderColor: "var(--m-line)", background: "var(--m-bg)", color: "var(--m-head)" } as const;

export function SpfGenerator() {
  const [picked, setPicked] = useState<string[]>(["stack"]);
  const [ip4, setIp4] = useState("");
  const [extra, setExtra] = useState("");
  const [useMx, setUseMx] = useState(false);
  const [useA, setUseA] = useState(false);
  const [policy, setPolicy] = useState("~all");

  const record = useMemo(() => {
    const parts = ["v=spf1"];
    if (useA) parts.push("a");
    if (useMx) parts.push("mx");
    for (const ip of ip4.split(/[\s,]+/).filter(Boolean)) parts.push(ip.includes(":") ? `ip6:${ip}` : `ip4:${ip}`);
    for (const s of SENDERS) if (picked.includes(s.id)) parts.push(s.value);
    for (const inc of extra.split(/[\s,]+/).filter(Boolean)) parts.push(inc.startsWith("include:") ? inc : `include:${inc}`);
    parts.push(policy);
    return parts.join(" ");
  }, [picked, ip4, extra, useMx, useA, policy]);
  const lookups = record.split(" ").filter((t) => /^(include:|a$|mx$)/.test(t)).length;

  return (
    <div className="grid gap-6 rounded-[24px] border p-5 sm:p-6" style={{ borderColor: "var(--m-line)" }}>
      <div>
        <p className="text-[14px] font-medium" style={{ color: "var(--m-head)" }}>Services that send email for your domain</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SENDERS.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-[14px]" style={{ borderColor: picked.includes(s.id) ? "var(--m-accent)" : "var(--m-line)", color: "var(--m-text)" }}>
              <input type="checkbox" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
              {s.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your own server IPs" hint="IPv4 or IPv6, separated by spaces or commas"><input className={inputCls} style={inputStyle} value={ip4} onChange={(e) => setIp4(e.target.value)} placeholder="203.0.113.10" /></Field>
        <Field label="Other includes" hint="Domains from other providers' SPF instructions"><input className={inputCls} style={inputStyle} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="_spf.example.net" /></Field>
      </div>
      <div className="flex flex-wrap gap-4 text-[14px]" style={{ color: "var(--m-text)" }}>
        <label className="flex items-center gap-2"><input type="checkbox" checked={useA} onChange={(e) => setUseA(e.target.checked)} /> Allow the domain&apos;s A record (a)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={useMx} onChange={(e) => setUseMx(e.target.checked)} /> Allow the domain&apos;s MX servers (mx)</label>
      </div>
      <Field label="Everything else">
        <select className={inputCls} style={inputStyle} value={policy} onChange={(e) => setPolicy(e.target.value)}>
          <option value="~all">~all: soft fail (recommended while setting up)</option>
          <option value="-all">-all: hard fail (strict)</option>
          <option value="?all">?all: neutral (not recommended)</option>
        </select>
      </Field>
      <RecordBox label="TXT record for your domain (host: @)" value={record} />
      <Findings items={[lookups > 10 ? { level: "error", text: `This record uses at least ${lookups} direct lookups; nested includes add more. SPF allows 10.` } : { level: "info", text: `${lookups} direct DNS lookup${lookups === 1 ? "" : "s"}. Includes can add nested lookups; run the SPF checker after publishing to see the total.` }, { level: "info", text: "Publish it as a single TXT record. If your domain already has a v=spf1 record, replace it instead of adding a second one." }]} />
    </div>
  );
}

export function DmarcGenerator() {
  const [p, setP] = useState("none");
  const [rua, setRua] = useState("");
  const [ruf, setRuf] = useState("");
  const [pct, setPct] = useState("100");
  const [sp, setSp] = useState("");
  const [adkim, setAdkim] = useState("r");
  const [aspf, setAspf] = useState("r");

  const record = useMemo(() => {
    const parts = [`v=DMARC1`, `p=${p}`];
    if (sp) parts.push(`sp=${sp}`);
    if (rua.trim()) parts.push(`rua=${rua.split(/[\s,]+/).filter(Boolean).map((a) => (a.startsWith("mailto:") ? a : `mailto:${a}`)).join(",")}`);
    if (ruf.trim()) parts.push(`ruf=${ruf.split(/[\s,]+/).filter(Boolean).map((a) => (a.startsWith("mailto:") ? a : `mailto:${a}`)).join(",")}`);
    if (pct !== "100") parts.push(`pct=${pct}`);
    if (adkim !== "r") parts.push(`adkim=${adkim}`);
    if (aspf !== "r") parts.push(`aspf=${aspf}`);
    return parts.join("; ");
  }, [p, rua, ruf, pct, sp, adkim, aspf]);

  return (
    <div className="grid gap-5 rounded-[24px] border p-5 sm:p-6" style={{ borderColor: "var(--m-line)" }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Policy (p)" hint="Start with none, then tighten">
          <select className={inputCls} style={inputStyle} value={p} onChange={(e) => setP(e.target.value)}>
            <option value="none">none: monitor only</option>
            <option value="quarantine">quarantine: send failures to spam</option>
            <option value="reject">reject: block failures</option>
          </select>
        </Field>
        <Field label="Subdomain policy (sp)" hint="Optional; defaults to p">
          <select className={inputCls} style={inputStyle} value={sp} onChange={(e) => setSp(e.target.value)}>
            <option value="">Same as p</option>
            <option value="none">none</option>
            <option value="quarantine">quarantine</option>
            <option value="reject">reject</option>
          </select>
        </Field>
        <Field label="Aggregate reports (rua)" hint="Mailbox that receives daily XML reports"><input className={inputCls} style={inputStyle} value={rua} onChange={(e) => setRua(e.target.value)} placeholder="dmarc@example.com" /></Field>
        <Field label="Forensic reports (ruf)" hint="Optional; few providers send these"><input className={inputCls} style={inputStyle} value={ruf} onChange={(e) => setRuf(e.target.value)} placeholder="" /></Field>
        <Field label="Apply to percentage (pct)">
          <select className={inputCls} style={inputStyle} value={pct} onChange={(e) => setPct(e.target.value)}>
            {["100", "75", "50", "25", "10"].map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="DKIM alignment">
            <select className={inputCls} style={inputStyle} value={adkim} onChange={(e) => setAdkim(e.target.value)}><option value="r">relaxed</option><option value="s">strict</option></select>
          </Field>
          <Field label="SPF alignment">
            <select className={inputCls} style={inputStyle} value={aspf} onChange={(e) => setAspf(e.target.value)}><option value="r">relaxed</option><option value="s">strict</option></select>
          </Field>
        </div>
      </div>
      <RecordBox label="TXT record (host: _dmarc)" value={record} />
      <Findings items={[!rua.trim() ? { level: "warn", text: "Add a rua address so you can see which services send as your domain before enforcing." } : { level: "ok", text: "Reports enabled. Review them for a few weeks before moving to quarantine or reject." }, ...(p === "reject" ? [{ level: "warn" as const, text: "p=reject blocks any legitimate sender you haven't authenticated yet. Make sure reports show everything passing first." }] : [])]} />
    </div>
  );
}
