"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview", icon: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z", exact: true },
  { href: "/admin/users", label: "Users", icon: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" },
  { href: "/admin/plans", label: "Plans", icon: "M3 7h18v4H3zM3 13h18v4H3z" },
  { href: "/admin/revenue", label: "Revenue", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { href: "/admin/analytics", label: "Analytics", icon: "M4 20V10M10 20V4M16 20v-6M22 20H2" },
  { href: "/admin/api-health", label: "API Health", icon: "M3 12h4l3 8 4-16 3 8h4" },
  { href: "/admin/code-flow", label: "Code Flow", icon: "M8 3v12a3 3 0 0 0 3 3h6M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" },
  { href: "/admin/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z" },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-bg-elevated">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <span className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold" style={{ background: "linear-gradient(135deg,#f43f5e,#f59e0b)", color: "#fff" }}>
          A
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">NanoSend</div>
          <div className="text-[11px]" style={{ color: "var(--danger)" }}>ADMIN</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--fg)" : "var(--fg-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link href="/emails" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg hover:bg-bg-hover">
          ← Back to app
        </Link>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle">{email}</span>
          <button onClick={logout} className="text-xs text-fg-muted hover:text-fg">Sign out</button>
        </div>
      </div>
    </aside>
  );
}
