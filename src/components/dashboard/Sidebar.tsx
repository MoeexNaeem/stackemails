"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { TeamSwitcher, type TeamOption } from "@/components/dashboard/TeamSwitcher";
import { CollapseButton } from "@/components/ui/CollapseButton";

type NavChild = { href: string; label: string; exact?: boolean };
type NavItem = { href: string; label: string; icon: string; children?: NavChild[] };

const I = {
  overview: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  emails: "M4 6h16v12H4V6zm0 0l8 6 8-6",
  templates: "M4 5h16v14H4zM4 9h16M9 9v10",
  audience: "M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z",
  inboxes: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  broadcasts: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  automations: "M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  metrics: "M4 20V10M10 20V4M16 20v-6M22 20H2",
  domains: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20",
  logs: "M3 5h18v14H3zM3 9h18M7 13h6",
  keys: "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 11l-7 7v3h3l7-7",
  webhooks: "M13 10V3L4 14h7v7l9-11h-7z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",
  shield: "M12 2l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
};

const GROUPS: NavItem[][] = [
  [
    { href: "/overview", label: "Overview", icon: I.overview },
    {
      href: "/emails",
      label: "Emails",
      icon: I.emails,
      children: [
        { href: "/emails", label: "Sending", exact: true },
        { href: "/emails/receiving", label: "Receiving" },
        { href: "/emails/suppressions", label: "Suppressions" },
      ],
    },
    { href: "/templates", label: "Templates", icon: I.templates },
    {
      href: "/audience",
      label: "Audience",
      icon: I.audience,
      children: [
        { href: "/audience", label: "Contacts", exact: true },
        { href: "/audience/properties", label: "Properties" },
        { href: "/audience/segments", label: "Segments" },
        { href: "/audience/topics", label: "Topics" },
      ],
    },
  ],
  [
    { href: "/inboxes", label: "Inboxes", icon: I.inboxes },
    { href: "/broadcasts", label: "Broadcasts", icon: I.broadcasts },
    {
      href: "/automations",
      label: "Automations",
      icon: I.automations,
      children: [
        { href: "/automations", label: "Automations", exact: true },
        { href: "/automations/events", label: "Events" },
      ],
    },
  ],
  [
    { href: "/metrics", label: "Metrics", icon: I.metrics },
    { href: "/domains", label: "Domains", icon: I.domains },
    { href: "/logs", label: "Logs", icon: I.logs },
    { href: "/api-keys", label: "API keys", icon: I.keys },
    { href: "/webhooks", label: "Webhooks", icon: I.webhooks },
  ],
];

function isActive(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function Icon({ d, size = 17 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Sidebar({
  teams,
  activeTeamId,
  isAdmin = false,
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  teams: TeamOption[];
  activeTeamId: string;
  isAdmin?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="h-full shrink-0 flex flex-col bg-bg-elevated border-r border-border transition-[width] duration-200 ease-out" style={{ width: collapsed ? 72 : 248 }}>
      <div className={`h-16 shrink-0 flex items-center gap-2 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/overview" className="flex min-w-0 items-center gap-2.5" onClick={onNavigate} title="Overview">
          <LogoMark size={26} />
          {!collapsed && <span className="truncate text-[16px] font-medium tracking-[-0.02em]">Stack Emails</span>}
        </Link>
        {onToggle && !collapsed && <CollapseButton collapsed={collapsed} onClick={onToggle} />}
      </div>

      {collapsed ? (
        onToggle && <div className="flex justify-center pb-2"><CollapseButton collapsed={collapsed} onClick={onToggle} /></div>
      ) : (
        <div className="px-3 pb-2">
          <TeamSwitcher teams={teams} activeId={activeTeamId} />
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="Dashboard">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
            {group.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-3 pb-3 space-y-0.5">
        <NavRow item={{ href: "/settings", label: "Settings", icon: I.settings }} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        <NavRow item={{ href: "/help", label: "Help", icon: I.help }} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            title="Admin panel"
            className={`flex items-center gap-3 rounded-xl py-2 text-[13.5px] font-medium transition-colors ${collapsed ? "justify-center px-0" : "px-3"}`}
            style={{ color: "var(--lime)", background: "color-mix(in srgb, var(--lime) 8%, transparent)" }}
          >
            <Icon d={I.shield} />
            {!collapsed && "Admin panel"}
          </Link>
        )}

        {!collapsed && <div className="mt-3 rounded-2xl p-4 text-center border border-border [@media(max-height:820px)]:hidden" style={{ background: "linear-gradient(180deg, var(--bg-card), var(--bg-elevated))" }}>
          <p className="text-[15px] font-normal">Need help?</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-subtle">Our support team is ready to help with sending, domains and deliverability.</p>
          <Link href="/help" onClick={onNavigate} className="btn btn-secondary btn-sm mt-3">
            Contact us
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
        </div>}
      </div>
    </aside>
  );
}

function NavRow({ item, pathname, onNavigate, collapsed = false }: { item: NavItem; pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  const groupActive = isActive(pathname, item.href);
  const [open, setOpen] = useState(groupActive);
  const expanded = item.children ? open || groupActive : false;
  const selfActive = !item.children && groupActive;

  return (
    <div>
      <div className="relative flex items-center">
        {selfActive && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: "var(--violet)" }} />}
        <Link
          href={item.href}
          onClick={() => {
            if (item.children) setOpen(true);
            onNavigate?.();
          }}
          title={collapsed ? item.label : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={`flex flex-1 items-center gap-3 rounded-xl py-2 text-[13.5px] transition-colors ${collapsed ? "justify-center px-0" : "px-3"}`}
          style={{
            background: selfActive ? "var(--bg-hover)" : "transparent",
            color: selfActive || (item.children && groupActive) ? "var(--fg)" : "var(--fg-muted)",
          }}
        >
          <Icon d={item.icon} />
          {!collapsed && item.label}
        </Link>
        {item.children && !collapsed && (
          <button
            type="button"
            onClick={() => setOpen((o) => !(o || groupActive))}
            className="absolute right-1.5 rounded-md p-1 text-fg-subtle hover:text-fg"
            aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={expanded}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform .2s" }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {item.children && expanded && !collapsed && (
        <div className="relative ml-[21px] mb-1 pl-4">
          <span className="absolute left-0 top-0 bottom-[14px] w-px" style={{ background: "var(--border-strong)" }} />
          {item.children.map((c) => {
            const active = isActive(pathname, c.href, c.exact);
            return (
              <div key={c.href} className="relative">
                <span className="absolute -left-4 top-1/2 h-px w-3" style={{ background: "var(--border-strong)" }} />
                {active && <span className="absolute -left-[49px] top-1 bottom-1 w-[3px] rounded-r-full" style={{ background: "var(--violet)" }} />}
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  className="block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors"
                  style={{ color: active ? "var(--fg)" : "var(--fg-subtle)", background: active ? "var(--bg-hover)" : "transparent" }}
                >
                  {c.label}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
