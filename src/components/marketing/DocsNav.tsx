"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { slug: string; title: string; group: string };

/** Docs sidebar: grouped links, collapsible on mobile. */
export function DocsNav({ items, groups }: { items: Item[]; groups: string[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = items.find((i) => pathname === `/docs/${i.slug}`);

  return (
    <nav aria-label="Documentation" className="text-[14px]">
      <button className="m-btn m-btn-light m-btn-sm mb-4 w-full justify-between lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {current?.title ?? "Overview"} <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      <div className={`${open ? "block" : "hidden"} space-y-7 lg:block`}>
        <div>
          <Link href="/docs" className="block rounded-lg px-3 py-1.5 transition-colors hover:text-[var(--m-head)]" style={{ color: pathname === "/docs" ? "var(--m-head)" : "var(--m-muted)", background: pathname === "/docs" ? "var(--m-linen)" : undefined, fontWeight: pathname === "/docs" ? 500 : 400 }}>
            Overview
          </Link>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 text-[11.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>{g}</p>
            <ul className="mt-2 space-y-0.5">
              {items.filter((i) => i.group === g).map((i) => {
                const active = pathname === `/docs/${i.slug}`;
                return (
                  <li key={i.slug}>
                    <Link href={`/docs/${i.slug}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-1.5 transition-colors hover:text-[var(--m-head)]" style={{ color: active ? "var(--m-head)" : "var(--m-muted)", background: active ? "var(--m-linen)" : undefined, fontWeight: active ? 500 : 400 }}>
                      {i.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
