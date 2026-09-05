"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/overview", label: "Overview", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" },
  { href: "/emails", label: "Emails", icon: "M4 6h16v12H4V6zm0 0l8 6 8-6" },
  { href: "/templates", label: "Templates", icon: "M4 5h16v14H4zM4 9h16M9 9v10" },
  { href: "/audiences", label: "Audiences", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" },
  { href: "/domains", label: "Domains", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" },
  { href: "/api-keys", label: "API Keys", icon: "M15 7a4 4 0 11-8 0 4 4 0 018 0zM11 11l-7 7v3h3l7-7" },
  { href: "/webhooks", label: "Webhooks", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4L4 11a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.6h4l.3-2.6a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 00.1-1z" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-bg-elevated">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Link href="/overview">
          <Logo size={26} />
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--bg-hover)" : "transparent",
                color: active ? "var(--fg)" : "var(--fg-muted)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <Link
          href="/docs"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v14H4zM8 5v14M8 9h12M8 13h12" />
          </svg>
          Documentation
        </Link>
      </div>
    </aside>
  );
}
