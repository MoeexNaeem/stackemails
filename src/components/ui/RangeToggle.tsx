"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Segmented 7d / 1m / 3m toggle (Monera) bound to a query param. */
export function RangeToggle({ value, options, param = "range" }: { value: string; options: { value: string; label: string }[]; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <div className="tabs" role="tablist" aria-label="Date range" data-pending={pending || undefined}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className="tab !px-3 !py-1 text-xs"
          data-active={o.value === value}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set(param, o.value);
            start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
