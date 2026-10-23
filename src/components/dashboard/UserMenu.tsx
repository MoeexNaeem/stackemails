"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark";

function initials(name: string, email: string) {
  const parts = (name || email).trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Top-right account pill (Monera) with the Resend account menu. */
export function UserMenu({ email, name }: { email: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as Theme) || "dark");
  }, []);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("stackemails-theme", next);
    } catch {
      /* storage may be unavailable */
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-fg-muted hover:bg-bg-hover hover:text-fg";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border pl-1 pr-3 h-9 hover:bg-bg-hover transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-strong)" }}>
          {initials(name, email)}
        </span>
        <span className="hidden md:block max-w-[140px] truncate text-[13px]">{name || email}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border-strong p-1.5 shadow-2xl" style={{ background: "var(--bg-elevated)" }}>
          <div className="px-3 py-2">
            <p className="text-[13px] font-medium truncate">{name}</p>
            <p className="text-xs text-fg-subtle truncate">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link href="/profile" className={item} onClick={() => setOpen(false)}>My profile</Link>
          <Link href="/settings/team?create=1" className={item} onClick={() => setOpen(false)}>Create team</Link>
          <Link href="/settings/team#invite" className={item} onClick={() => setOpen(false)}>Invite members</Link>
          <Link href="/onboarding" className={item} onClick={() => setOpen(false)}>Onboarding</Link>
          <div className="flex items-center justify-between px-3 py-2 text-[13px] text-fg-muted">
            <span>Appearance</span>
            <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: "var(--bg-hover)" }}>
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => applyTheme(t)}
                  className="rounded-full px-2.5 py-1 text-xs capitalize"
                  style={{ background: theme === t ? "var(--bg-card)" : "transparent", color: theme === t ? "var(--fg)" : undefined }}
                  aria-pressed={theme === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Link href="/" className={item} onClick={() => setOpen(false)}>
            Homepage
            <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M8 7h9v9" /></svg>
          </Link>
          <div className="my-1 h-px bg-border" />
          <button onClick={logout} className={item} style={{ color: "var(--danger)" }}>Log out</button>
        </div>
      )}
    </div>
  );
}
