"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Request = {
  title: string;
  description?: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

let open: ((r: Request) => void) | null = null;

const DANGER = /^(delete|remove|revoke|suspend|permanently|leave|rotate|cancel|disable)/i;

/**
 * Promise-based replacement for window.confirm(). Pass the question as the
 * first sentence ("Delete this plan? Existing subscribers keep…"): it becomes
 * the title and the rest the description.
 */
export function confirmDialog(message: string, opts: { title?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  const q = message.indexOf("?");
  const title = opts.title ?? (q > 0 ? message.slice(0, q + 1) : message);
  const description = opts.title ? message : q > 0 ? message.slice(q + 1).trim() || undefined : undefined;
  const danger = opts.danger ?? DANGER.test(title);
  const verb = title.match(/^(\w+)/)?.[1] ?? "Confirm";
  const confirmLabel = opts.confirmLabel ?? (DANGER.test(verb) || /^(send|schedule)$/i.test(verb) ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : "Confirm");
  if (!open) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => open!({ title, description, confirmLabel, danger, resolve }));
}

/** Mounted once in the root layout; renders the active confirmation. */
export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    open = (r) => setReq(r);
    return () => {
      open = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => confirmRef.current?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  function close(ok: boolean) {
    req?.resolve(ok);
    setReq(null);
  }

  if (!req) return null;
  return (
    <div className="se-confirm-backdrop" onMouseDown={() => close(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="se-confirm-title" className="se-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex gap-4">
          <span className="se-confirm-icon" data-danger={req.danger || undefined}>
            <Icon name={req.danger ? "alert" : "shield"} size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="se-confirm-title" className="text-[16px] font-medium leading-snug">{req.title}</h2>
            {req.description && <p className="mt-1.5 text-sm leading-relaxed opacity-70">{req.description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="se-confirm-btn" onClick={() => close(false)}>Cancel</button>
          <button type="button" ref={confirmRef} className="se-confirm-btn" data-primary data-danger={req.danger || undefined} onClick={() => close(true)}>
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
