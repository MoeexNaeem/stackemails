"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/audience", label: "Contacts", exact: true },
  { href: "/audience/properties", label: "Properties" },
  { href: "/audience/segments", label: "Segments" },
  { href: "/audience/topics", label: "Topics" },
];

export function AudienceTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs mb-6" aria-label="Audience">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href || pathname.startsWith("/audience/contacts") : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" data-active={active}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
