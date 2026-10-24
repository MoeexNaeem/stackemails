"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/** Shared body for error.tsx boundaries (dashboard, admin and public site). */
export function ErrorState({ error, reset, home = "/", homeLabel = "Go home", variant = "app" }: { error: Error & { digest?: string }; reset: () => void; home?: string; homeLabel?: string; variant?: "app" | "site" }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const site = variant === "site";
  return (
    <div className={site ? "m-container py-32 text-center" : "flex min-h-[60vh] items-center justify-center p-6"}>
      <div className={site ? "mx-auto max-w-md" : "card mx-auto max-w-md p-8 text-center"}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, #fb6f8b 16%, transparent)", color: "#fb6f8b" }}>
          <Icon name="alert" size={22} />
        </span>
        <h1 className={site ? "m-display mt-6 text-[36px]" : "mt-5 text-xl font-medium"}>Something went wrong</h1>
        <p className={site ? "m-lead mt-3" : "mt-2 text-sm text-fg-muted"}>
          This page hit an unexpected error. Try again, and if it keeps happening, contact support{error.digest ? " with the reference below" : ""}.
        </p>
        {error.digest && <p className="mono mt-3 text-xs opacity-60">Ref: {error.digest}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className={site ? "m-btn m-btn-ink" : "btn btn-primary"}>
            <Icon name="refresh" size={14} /> Try again
          </button>
          <Link href={home} className={site ? "m-btn m-btn-light" : "btn btn-secondary"}>{homeLabel}</Link>
        </div>
      </div>
    </div>
  );
}
