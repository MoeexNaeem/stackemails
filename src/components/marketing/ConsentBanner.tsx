"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_KEY } from "@/lib/ga";

type Gtag = (...args: unknown[]) => void;

function save(choice: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {}
  (window as unknown as { gtag?: Gtag }).gtag?.("consent", "update", { analytics_storage: choice });
}

/** Cookie notice for Google Analytics. Shown until the visitor chooses; reopened from the footer. */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {}
    if (stored !== "granted" && stored !== "denied") setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener("se-open-consent", reopen);
    return () => window.removeEventListener("se-open-consent", reopen);
  }, []);

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-xl rounded-2xl border p-4 shadow-2xl sm:p-5" style={{ background: "var(--m-surface)", borderColor: "var(--m-line)" }}>
      <p className="text-[14px] leading-relaxed" style={{ color: "var(--m-text)" }}>
        We use Google Analytics cookies to understand how people use our website, so we can improve it. No advertising cookies. See our{" "}
        <Link href="/privacy#cookies" className="underline">privacy policy</Link>.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="m-btn m-btn-light" onClick={() => { save("denied"); setOpen(false); }}>Decline</button>
        <button type="button" className="m-btn m-btn-ink" onClick={() => { save("granted"); setOpen(false); }}>Accept</button>
      </div>
    </div>
  );
}

/** Footer link that reopens the cookie notice. */
export function CookieSettingsLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <button type="button" className={className} style={style} onClick={() => window.dispatchEvent(new Event("se-open-consent"))}>
      Cookie settings
    </button>
  );
}
