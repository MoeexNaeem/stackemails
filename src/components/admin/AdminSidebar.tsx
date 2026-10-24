"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { CollapseButton } from "@/components/ui/CollapseButton";
import { useCollapsed } from "@/components/ui/useCollapsed";

type Item = { href: string; label: string; icon: string; exact?: boolean; badge?: number };

const I = {
  overview: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  users: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z",
  support: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  blog: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  mail: "M4 6h16v12H4V6zm0 0l8 6 8-6",
  plans: "M3 7h18v4H3zM3 13h18v4H3z",
  revenue: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  analytics: "M4 20V10M10 20V4M16 20v-6M22 20H2",
  health: "M3 12h4l3 8 4-16 3 8h4",
  flow: "M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L4 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z",
  back: "M19 12H5M11 6l-6 6 6 6",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10",
};

/**
 * Fixed admin sidebar: full viewport height, its own scroll, "Back to
 * dashboard" pinned at the bottom. One button collapses it to an icon rail.
 */
export function AdminSidebar({ email, openTickets, newMessages }: { email: string; openTickets: number; newMessages: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, toggle] = useCollapsed("se-admin-sidebar");

  const groups: Item[][] = [
    [
      { href: "/admin", label: "Overview", icon: I.overview, exact: true },
      { href: "/admin/users", label: "Teams & users", icon: I.users },
      { href: "/admin/support", label: "Support", icon: I.support, badge: openTickets },
      { href: "/admin/messages", label: "Messages", icon: I.inbox, badge: newMessages },
    ],
    [
      { href: "/admin/blog", label: "Blog", icon: I.blog },
      { href: "/admin/system-emails", label: "System emails", icon: I.mail },
    ],
    [
      { href: "/admin/plans", label: "Plans", icon: I.plans },
      { href: "/admin/revenue", label: "Revenue", icon: I.revenue },
      { href: "/admin/analytics", label: "Analytics", icon: I.analytics },
      { href: "/admin/api-health", label: "API health", icon: I.health },
      { href: "/admin/code-flow", label: "Code flow", icon: I.flow },
      { href: "/admin/settings", label: "Settings", icon: I.settings },
    ],
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="hidden h-full shrink-0 flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-out lg:flex"
      style={{ width: collapsed ? 72 : 248 }}
      data-collapsed={collapsed || undefined}
    >
      <div className={`flex h-16 shrink-0 items-center gap-2.5 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5" title="Admin overview">
          <LogoMark size={28} />
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-medium tracking-[-0.02em]">Stack Emails</span>
              <span className="block text-[10.5px] font-semibold tracking-[0.14em]" style={{ color: "var(--lime)" }}>ADMIN</span>
            </span>
          )}
        </Link>
        {!collapsed && <CollapseButton collapsed={collapsed} onClick={toggle} className="ml-auto" />}
      </div>
      {collapsed && (
        <div className="flex justify-center pb-2">
          <CollapseButton collapsed={collapsed} onClick={toggle} />
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="Admin">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3 border-t border-border pt-3" : ""}>
            {g.map((item) => <Row key={item.href} item={item} pathname={pathname} collapsed={collapsed} />)}
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <Link
          href="/overview"
          title="Back to dashboard"
          className={`flex items-center gap-3 rounded-xl py-2 text-[13.5px] font-medium text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg ${collapsed ? "justify-center px-0" : "px-3"}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={I.back} /></svg>
          {!collapsed && "Back to dashboard"}
        </Link>
        <div className={`flex items-center gap-2 py-1.5 ${collapsed ? "justify-center" : "px-3"}`}>
          {!collapsed && <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle" title={email}>{email}</span>}
          <button onClick={logout} className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg" title="Sign out" aria-label="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={I.logout} /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Row({ item, pathname, collapsed }: { item: Item; pathname: string; collapsed: boolean }) {
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <div className="relative">
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: "var(--violet)" }} />}
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={`relative flex items-center gap-3 rounded-xl py-2 text-[13.5px] font-medium transition-colors hover:text-fg ${collapsed ? "justify-center px-0" : "px-3"}`}
        style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--fg)" : "var(--fg-muted)" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={item.icon} /></svg>
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!!item.badge &&
          (collapsed ? (
            <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full" style={{ background: "var(--violet)" }} />
          ) : (
            <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--violet)", color: "#141415" }}>{item.badge > 99 ? "99+" : item.badge}</span>
          ))}
      </Link>
    </div>
  );
}

/** Compact horizontal nav for small screens (the sidebar is hidden below lg). */
export function AdminMobileNav() {
  const pathname = usePathname();
  const links = [
    ["/admin", "Overview"], ["/admin/users", "Teams"], ["/admin/support", "Support"], ["/admin/messages", "Messages"],
    ["/admin/blog", "Blog"], ["/admin/system-emails", "Emails"], ["/admin/plans", "Plans"], ["/admin/revenue", "Revenue"], ["/admin/analytics", "Analytics"], ["/admin/settings", "Settings"],
  ];
  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden" aria-label="Admin">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px]" style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--fg)" : "var(--fg-muted)" }}>{label}</Link>
        );
      })}
    </nav>
  );
}
