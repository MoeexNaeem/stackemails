"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** "Page 1 – 1 of 3 · 40 items" pager that keeps the current filters. */
export function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
      <span>
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <span>
          Page {page} of {pages}
        </span>
        <button className="btn btn-secondary btn-sm w-8 px-0" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">‹</button>
        <button className="btn btn-secondary btn-sm w-8 px-0" disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Next page">›</button>
      </div>
    </div>
  );
}
