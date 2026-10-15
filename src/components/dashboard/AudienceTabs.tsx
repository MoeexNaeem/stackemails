"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TABS = [
  { key: "contacts", label: "Contacts" },
  { key: "properties", label: "Properties" },
  { key: "segments", label: "Segments" },
  { key: "topics", label: "Topics" },
];

export function AudienceTabs() {
  const params = useSearchParams();
  const active = params.get("tab") ?? "contacts";
  return (
    <div className="flex gap-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "contacts" ? "/audiences" : `/audiences?tab=${t.key}`}
          className="tab"
          data-active={active === t.key}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
