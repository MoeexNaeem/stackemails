"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/marketing/ThemeToggle";
import { Icon } from "@/components/ui/Icon";
import { LinkSpinner, NotPending } from "@/components/ui/RouteProgress";

const LINKS = [
  { href: "/features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
];

/**
 * Transparent over the hero; once the page scrolls it condenses into a
 * floating frosted-glass pill. The header has a negative bottom margin so
 * page heroes (and their backdrops) start underneath it.
 */
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setSignedIn(document.cookie.split("; ").some((c) => c.startsWith("se_signed_in=1")));
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const solid = scrolled || open;

  return (
    <header className="sticky top-0 z-50 -mb-[72px] px-3 pt-3 sm:px-5">
      <div
        className="mx-auto flex h-[60px] items-center justify-between gap-6 rounded-full pl-5 pr-2.5 transition-all duration-300 ease-out"
        style={{
          maxWidth: solid ? 1120 : 1240,
          background: solid ? "var(--m-nav)" : "transparent",
          backdropFilter: solid ? "saturate(180%) blur(16px)" : "none",
          WebkitBackdropFilter: solid ? "saturate(180%) blur(16px)" : "none",
          border: `1px solid ${solid ? "var(--m-line)" : "transparent"}`,
          boxShadow: solid ? "0 12px 32px -16px rgba(17, 34, 32, 0.28)" : "none",
        }}
      >
        <Link href="/" aria-label="Stack Emails home" className="shrink-0">
          <Logo tone="ink" size={28} />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className="relative rounded-full px-3.5 py-2 text-[14px] transition-colors hover:bg-[color-mix(in_srgb,var(--m-head)_6%,transparent)] hover:text-[var(--m-head)]"
                style={{ color: active ? "var(--m-head)" : "var(--m-text)", fontWeight: 500 }}
              >
                {l.label}
                {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full" style={{ background: "var(--m-accent)" }} />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/overview" className="m-btn m-btn-ink m-btn-sm">Dashboard <LinkSpinner /><NotPending><Icon name="arrow-right" size={14} /></NotPending></Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-[14px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--m-head)_6%,transparent)]" style={{ color: "var(--m-ink)" }}>Sign in</Link>
              <Link href="/signup" className="m-btn m-btn-ink m-btn-sm">Get started free <LinkSpinner /></Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button className="rounded-full p-2" style={{ color: "var(--m-head)" }} onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-[1120px] rounded-3xl border p-3 shadow-xl md:hidden" style={{ borderColor: "var(--m-line)", background: "var(--m-nav)", backdropFilter: "saturate(180%) blur(16px)", WebkitBackdropFilter: "saturate(180%) blur(16px)" }}>
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => <Link key={l.href} href={l.href} className="rounded-2xl px-3 py-3 text-[17px]" style={{ color: "var(--m-head)" }}>{l.label}</Link>)}
            <div className="mt-2 grid gap-2">
              {signedIn ? (
                <Link href="/overview" className="m-btn m-btn-ink">Dashboard <LinkSpinner /></Link>
              ) : (
                <>
                  <Link href="/signup" className="m-btn m-btn-ink">Get started free</Link>
                  <Link href="/login" className="m-btn m-btn-light">Sign in</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
