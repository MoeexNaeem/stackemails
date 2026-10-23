"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/smtp", label: "SMTP" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/unsubscribe-page", label: "Unsubscribe page" },
  { href: "/settings/documents", label: "Documents" },
  { href: "/settings/labs", label: "Labs" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs mb-7 max-w-full overflow-x-auto" aria-label="Settings">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" data-active={pathname === t.href || (t.href === "/settings/team" && pathname === "/settings/exports")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
