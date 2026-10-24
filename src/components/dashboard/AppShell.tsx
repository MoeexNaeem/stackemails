"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { AssistantPanel } from "@/components/dashboard/AssistantPanel";
import { useCollapsed } from "@/components/ui/useCollapsed";
import type { TeamOption } from "@/components/dashboard/TeamSwitcher";

export function AppShell({
  children,
  teams,
  activeTeamId,
  user,
  usage,
  assistantEnabled = true,
}: {
  children: React.ReactNode;
  teams: TeamOption[];
  activeTeamId: string;
  user: { name: string; email: string; isAdmin: boolean };
  usage: { sent: number; quota: number };
  assistantEnabled?: boolean;
}) {
  const [drawer, setDrawer] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [collapsed, toggleCollapsed] = useCollapsed("se-sidebar");
  const pathname = usePathname();
  const pct = Math.min(100, Math.round((usage.sent / Math.max(1, usage.quota)) * 100));

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (assistantEnabled && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistant((a) => !a);
      }
      if (e.key === "Escape") setDrawer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assistantEnabled]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden h-full lg:block">
        <Sidebar teams={teams} activeTeamId={activeTeamId} isAdmin={user.isAdmin} collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar teams={teams} activeTeamId={activeTeamId} isAdmin={user.isAdmin} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="h-16 shrink-0 flex items-center justify-between gap-3 border-b border-border px-4 sm:px-6 bg-bg-elevated/70 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <button className="btn btn-ghost w-9 px-0 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <Link href="/settings/usage" className="hidden sm:flex items-center gap-2.5 rounded-full border border-border px-3 h-8 text-xs text-fg-muted hover:text-fg" title="Monthly usage">
              <span>{usage.sent.toLocaleString()} / {usage.quota.toLocaleString()} emails</span>
              <span className="w-16 h-1.5 rounded-full overflow-hidden bg-bg-hover">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--danger)" : "var(--lime)" }} />
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {assistantEnabled && <button onClick={() => setAssistant(true)} className="btn btn-secondary btn-sm" aria-label="Ask anything">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
              <span className="hidden sm:inline">Ask anything</span>
              <span className="kbd hidden md:inline-flex">Ctrl K</span>
            </button>}
            <Link href="/docs" className="btn btn-ghost btn-sm hidden sm:inline-flex">Docs</Link>
            <UserMenu email={user.email} name={user.name} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 py-7">{children}</div>
        </main>
      </div>

      {assistantEnabled && <AssistantPanel open={assistant} onClose={() => setAssistant(false)} />}
    </div>
  );
}
