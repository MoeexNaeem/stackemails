"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Icon";

export type FilterField =
  | { type: "search"; name: string; placeholder?: string }
  | { type: "select"; name: string; options: { value: string; label: string }[]; defaultValue?: string };

/**
 * URL-driven filter bar. Every control writes to the query string, so the
 * server component re-renders with filtered results - shareable, back-button
 * friendly and SSR-correct. Search is debounced.
 */
export function FilterBar({ fields, exportHref }: { fields: FilterField[]; exportHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(name: string, value: string, defaultValue = "") {
    const next = new URLSearchParams(params.toString());
    if (!value || value === defaultValue) next.delete(name);
    else next.set(name, value);
    next.delete("page"); // filters reset pagination
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4" data-pending={pending || undefined}>
      {fields.map((f) =>
        f.type === "search" ? (
          <SearchInput key={f.name} name={f.name} placeholder={f.placeholder} initial={params.get(f.name) ?? ""} onChange={(v) => update(f.name, v)} />
        ) : (
          <div key={f.name} className="min-w-[160px]">
            <Select
              ariaLabel={f.name}
              options={f.options}
              value={params.get(f.name) ?? f.defaultValue ?? f.options[0]?.value ?? ""}
              onChange={(v) => update(f.name, v, f.defaultValue ?? f.options[0]?.value)}
              align="right"
            />
          </div>
        ),
      )}
      {exportHref && (
        <a
          href={`${exportHref}${exportHref.includes("?") ? "&" : "?"}${params.toString()}`}
          className="btn btn-secondary w-9 px-0"
          title="Export CSV"
          aria-label="Export CSV"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" /></svg>
        </a>
      )}
      {pending && <span className="flex items-center gap-1.5 text-xs text-fg-subtle"><Spinner size={13} /> Updating</span>}
    </div>
  );
}

function SearchInput({ name, placeholder, initial, onChange }: { name: string; placeholder?: string; initial: string; onChange: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => onChange(value.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex-1 min-w-[220px]">
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input
        name={name}
        className="input input-pill pl-9"
        placeholder={placeholder ?? "Search…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="search"
      />
    </div>
  );
}
