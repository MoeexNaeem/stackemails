import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { ContactMessage, SupportTicket } from "@/lib/db/models";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Stack Emails" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await connectToDatabase();
  const [openTickets, newMessages] = await Promise.all([
    SupportTicket.countDocuments({ status: "open" }),
    ContactMessage.countDocuments({ status: "new" }),
  ]);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <AdminSidebar email={admin.email} openTickets={openTickets} newMessages={newMessages} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
          <span className="text-[15px]">Platform admin</span>
          <span className="rounded-full px-3 py-1 text-[11.5px] font-medium" style={{ background: "color-mix(in srgb, var(--lime) 12%, transparent)", color: "var(--lime)", border: "1px solid color-mix(in srgb, var(--lime) 30%, transparent)" }}>
            Superadmin · {admin.email}
          </span>
        </header>
        <AdminMobileNav />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
