import { requireAdmin } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full">
      <AdminSidebar email={admin.email} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-bg-elevated/50 backdrop-blur">
          <span className="text-sm font-medium">Platform Admin</span>
          <span
            className="badge"
            style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)" }}
          >
            Superadmin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
