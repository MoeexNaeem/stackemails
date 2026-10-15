"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/dashboard/UserMenu";

const NAV = [
  { href: "/emails", label: "Emails", icon: "M4 6h16v12H4V6zm0 0l8 6 8-6" },
  { href: "/broadcasts", label: "Broadcasts", icon: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { href: "/automations", label: "Automations", icon: "M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" },
  { href: "/templates", label: "Templates", icon: "M4 5h16v14H4zM4 9h16M9 9v10" },
  { href: "/audiences", label: "Audience", icon: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" },
  { href: "/metrics", label: "Metrics", icon: "M4 20V10M10 20V4M16 20v-6M22 20H2" },
  { href: "/domains", label: "Domains", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" },
  { href: "/logs", label: "Logs", icon: "M3 5h18v14H3zM3 9h18" },
  { href: "/api-keys", label: "API keys", icon: "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 11l-7 7v3h3l7-7" },
  { href: "/webhooks", label: "Webhooks", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z" },
];

export function Sidebar({
  workspaceName,
  userEmail,
  userName,
  isAdmin = false,
}: {
  workspaceName: string;
  userEmail: string;
  userName: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const initial = (workspaceName || "?").charAt(0).toUpperCase();

  return (
    <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-bg-elevated">
      {/* Team switcher */}
      <div className="h-16 flex items-center px-3 border-b border-border">
        <Link
          href="/settings"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-bg-hover transition-colors"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff" }}
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{workspaceName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
          </svg>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
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
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-1 text-sm font-medium"
            style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>
            Admin panel
          </Link>
        )}
        <UserMenu email={userEmail} name={userName} />
      </div>
    </aside>
  );
}
