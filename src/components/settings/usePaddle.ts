"use client";

import { useEffect, useRef, useState } from "react";

export type PaddleConfig = { token: string; sandbox: boolean };

type PaddleEvent = { name?: string; data?: unknown };
type PaddleJs = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string; eventCallback?: (e: PaddleEvent) => void }) => void;
  Checkout: { open: (opts: Record<string, unknown>) => void };
};
declare global {
  interface Window {
    Paddle?: PaddleJs;
    __sePaddleReady?: boolean;
    __sePaddleListeners?: Set<(e: PaddleEvent) => void>;
  }
}

const SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

function load(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  let tag = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
  if (!tag) {
    tag = document.createElement("script");
    tag.src = SRC;
    tag.async = true;
    document.head.appendChild(tag);
  }
  return new Promise((resolve, reject) => {
    tag!.addEventListener("load", () => resolve(), { once: true });
    tag!.addEventListener("error", () => reject(new Error("Paddle.js failed to load")), { once: true });
  });
}

/**
 * Load and initialise Paddle.js once per page. Initialising also lets Paddle
 * open a checkout by itself when the URL carries ?_ptxn= (links in Paddle's
 * emails, e.g. "update your payment method"), so this page can be the
 * "default payment link" in Paddle's checkout settings.
 */
export function usePaddle(config: PaddleConfig | null, onEvent?: (e: PaddleEvent) => void) {
  const [ready, setReady] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!config) return;
    const listener = (e: PaddleEvent) => handler.current?.(e);
    window.__sePaddleListeners ??= new Set();
    window.__sePaddleListeners.add(listener);
    let cancelled = false;
    load()
      .then(() => {
        if (cancelled || !window.Paddle) return;
        if (!window.__sePaddleReady) {
          if (config.sandbox) window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({ token: config.token, eventCallback: (e) => window.__sePaddleListeners?.forEach((l) => l(e)) });
          window.__sePaddleReady = true;
        }
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.__sePaddleListeners?.delete(listener);
    };
  }, [config]);

  function openCheckout(opts: { priceId: string; email: string; workspaceId: string }) {
    window.Paddle?.Checkout.open({
      items: [{ priceId: opts.priceId, quantity: 1 }],
      customer: { email: opts.email },
      customData: { workspaceId: opts.workspaceId },
      settings: { displayMode: "overlay", allowLogout: false },
    });
  }

  return { ready, openCheckout };
}
