"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  let tag = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (!tag) {
    tag = document.createElement("script");
    tag.src = SCRIPT_SRC;
    tag.async = true;
    document.head.appendChild(tag);
  }
  return new Promise((resolve, reject) => {
    tag!.addEventListener("load", () => resolve(), { once: true });
    tag!.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
  });
}

/**
 * Cloudflare Turnstile widget. It adds a hidden "cf-turnstile-response" input to
 * the surrounding form, which the signup API checks. `resetKey` changing (e.g. a
 * new error) issues a fresh token, since each token can be used only once.
 */
export function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile || id.current) return;
        id.current = window.turnstile.render(box.current, { sitekey: siteKey, theme: "auto", size: "flexible" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey && id.current && window.turnstile) window.turnstile.reset(id.current);
  }, [resetKey]);

  return <div ref={box} className="min-h-[65px]" />;
}
