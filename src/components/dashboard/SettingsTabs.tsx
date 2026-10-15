"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/smtp", label: "SMTP" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/unsubscribe", label: "Unsubscribe page" },
  { href: "/settings/documents", label: "Documents" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1 mb-8">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" data-active={pathname === t.href}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
