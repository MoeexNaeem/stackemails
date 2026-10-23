"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";

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
};

export function AdminSidebar({ email, openTickets, newMessages }: { email: string; openTickets: number; newMessages: number }) {
  const pathname = usePathname();
  const router = useRouter();

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
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-bg-elevated lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-4">
        <LogoMark size={26} />
        <div className="leading-tight">
          <div className="text-[15px] font-medium tracking-[-0.02em]">Stack Emails</div>
          <div className="text-[10.5px] font-semibold tracking-[0.14em]" style={{ color: "var(--lime)" }}>ADMIN</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Admin">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3 border-t border-border pt-3" : ""}>
            {g.map((item) => <Row key={item.href} item={item} pathname={pathname} />)}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <Link href="/overview" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg">← Back to dashboard</Link>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle">{email}</span>
          <button onClick={logout} className="text-xs text-fg-muted hover:text-fg">Sign out</button>
        </div>
      </div>
    </aside>
  );
}

function Row({ item, pathname }: { item: Item; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <div className="relative">
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: "var(--violet)" }} />}
      <Link
        href={item.href}
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors hover:text-fg"
        style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--fg)" : "var(--fg-muted)" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={item.icon} /></svg>
        <span className="flex-1">{item.label}</span>
        {!!item.badge && <span className="rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--violet)", color: "#141415" }}>{item.badge > 99 ? "99+" : item.badge}</span>}
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
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden" aria-label="Admin">
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px]" style={{ background: active ? "var(--bg-hover)" : "transparent", color: active ? "var(--fg)" : "var(--fg-muted)" }}>{label}</Link>
        );
      })}
    </nav>
  );
}
