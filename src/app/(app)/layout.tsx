import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getActiveWorkspace(user);
  if (!workspace) redirect("/login");

  const used = workspace.usage?.sent ?? 0;
  const pct = Math.min(100, Math.round((used / workspace.monthlyQuota) * 100));

  return (
    <div className="flex min-h-full">
      <Sidebar workspaceName={workspace.name} userEmail={user.email} userName={user.name} isAdmin={user.platformRole === "admin"} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-bg-elevated/50 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="badge shrink-0"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-strong)", color: "var(--fg-muted)" }}
            >
              {used.toLocaleString()} / {workspace.monthlyQuota.toLocaleString()} sent
            </span>
            <div className="hidden sm:block w-24 h-1.5 rounded-full overflow-hidden bg-bg-hover shrink-0">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm text-fg-muted hover:text-fg transition-colors">
              Docs
            </Link>
            <a
              href="mailto:support@nanosend.dev"
              className="badge"
              style={{ background: "var(--bg-hover)", border: "1px solid var(--border-strong)", color: "var(--fg-muted)" }}
            >
              Need help?
            </a>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
