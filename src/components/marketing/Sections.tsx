import Link from "next/link";

/** Shared marketing building blocks (kept deliberately small and quiet). */

export function PageHero({ eyebrow, title, highlight, lead, children }: { eyebrow: string; title: string; highlight?: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div className="m-hero-bg" aria-hidden>
        <span className="m-blob m-blob-a" />
        <span className="m-blob m-blob-b" style={{ opacity: 0.7 }} />
      </div>
      <div className="relative z-[1] m-container pt-32 pb-14 sm:pt-36">
        <p className="m-enter m-eyebrow">{eyebrow}</p>
        <h1 className="m-enter m-display m-h1 mt-5 max-w-[18ch]" style={{ "--d": "80ms" } as React.CSSProperties}>
          {title} {highlight && <span className="m-highlight">{highlight}</span>}
        </h1>
        {lead && <p className="m-enter m-lead mt-6 max-w-[640px]" style={{ "--d": "160ms" } as React.CSSProperties}>{lead}</p>}
        {children && <div className="m-enter mt-8 flex flex-wrap gap-3" style={{ "--d": "240ms" } as React.CSSProperties}>{children}</div>}
      </div>
    </section>
  );
}

export function CtaBand({ title = "Ship email your users actually receive.", lead = "Create a free account, verify your domain and send in minutes." }: { title?: string; lead?: string }) {
  return (
    <section className="m-container py-20">
      <div data-reveal="zoom" className="m-glow-border relative overflow-hidden rounded-[32px] px-8 py-14 text-center sm:px-16" style={{ background: "var(--m-dark)", border: "1px solid var(--m-dark-line)" }}>
        <div className="m-hero-bg" aria-hidden style={{ "--m-grid-line": "rgba(255,255,255,0.05)" } as React.CSSProperties}>
          <span className="m-orb" style={{ width: 520, height: 520, left: "50%", bottom: -360, marginLeft: -260, background: "rgba(115,102,254,0.55)" }} />
        </div>
        <h2 className="relative mx-auto max-w-[20ch] text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[44px]">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-[520px] text-[17px]" style={{ color: "#94a3b8" }}>{lead}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="m-btn m-btn-lime">Start for free</Link>
          <Link href="/docs" className="m-btn" style={{ color: "#fff", border: "1px solid #334155" }}>Read the docs</Link>
        </div>
      </div>
    </section>
  );
}

export function Faq({ items, title = "Frequently asked questions" }: { items: { q: string; a: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="m-container py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        <h2 className="m-h2 text-[32px] sm:text-[40px]">{title}</h2>
        <div>
          {items.map((f) => (
            <details key={f.q} data-reveal className="group border-b py-5" style={{ borderColor: "var(--m-line)" }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold" style={{ color: "var(--m-head)" }}>
                {f.q}
                <span className="text-xl transition-transform group-open:rotate-45" style={{ color: "var(--m-faint)" }}>+</span>
              </summary>
              <p className="m-body mt-3" style={{ color: "var(--m-muted)" }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CodeBlock({ label, code }: { label?: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-[22px] border" style={{ background: "#15171a", borderColor: "#262a30" }}>
      {label && <div className="border-b px-5 py-3 text-[12.5px]" style={{ borderColor: "#262a30", color: "#94a3b8" }}>{label}</div>}
      <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed" style={{ color: "#e5e7eb", fontFamily: "var(--font-mono)" }}><code>{code}</code></pre>
    </div>
  );
}

export function faqLd(items: { q: string; a: string }[]) {
  return { "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return { "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })) };
}
