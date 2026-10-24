"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { toastResult } from "@/lib/toast";

/** Accessible modal: focus moves in on open, Esc / backdrop closes, scroll is locked. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(2px)" }} onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card w-full ${width} p-6 my-8`}
        style={{ background: "var(--bg-elevated)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-medium">{title}</h2>
            {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
          </div>
          <button type="button" className="btn btn-ghost w-8 h-8 px-0 -mr-2" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Success / error line under forms. */
export function FormNote({ state }: { state: { ok: boolean; error?: string; message?: string } }) {
  // Every new action result also raises a toast; errors stay inline next to the form.
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    toastResult(state);
  }, [state]);
  if (state.error) return <p role="alert" className="flex items-start gap-2 text-sm rounded-xl px-3 py-2" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}><Icon name="alert" size={15} className="mt-0.5" />{state.error}</p>;
  return null;
}
