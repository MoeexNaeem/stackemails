"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
}

export function UserMenu({ email, name }: { email: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setTheme(getInitialTheme()), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("nanosend-theme", next);
    } catch {
      /* storage may be unavailable */
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-60 card p-1.5 shadow-2xl z-50"
          style={{ background: "var(--bg-elevated)" }}
        >
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover"
            onClick={() => setOpen(false)}
          >
            My profile
          </Link>

          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
            <span className="text-fg-muted">Appearance</span>
            <div className="flex items-center gap-1 rounded-md p-0.5" style={{ background: "var(--bg-hover)" }}>
              <button
                onClick={() => applyTheme("light")}
                className="rounded p-1"
                style={{ background: theme === "light" ? "var(--bg-card)" : "transparent" }}
                aria-label="Light theme"
                title="Light"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </button>
              <button
                onClick={() => applyTheme("dark")}
                className="rounded p-1"
                style={{ background: theme === "dark" ? "var(--bg-card)" : "transparent" }}
                aria-label="Dark theme"
                title="Dark"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              </button>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover"
            onClick={() => setOpen(false)}
          >
            Homepage
          </Link>

          <div className="my-1 h-px" style={{ background: "var(--border)" }} />

          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover"
            style={{ color: "var(--danger)" }}
          >
            Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-bg-hover transition-colors"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{email}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      </button>
    </div>
  );
}
