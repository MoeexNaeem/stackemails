"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/Icon";

/**
 * Thin progress bar at the top of the window for every in-app navigation:
 * starts on an internal link click, finishes when the new route renders.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [p, setP] = useState(0); // 0 = hidden, (0,1) running, 1 = finishing
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Finish whenever the URL actually changes.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setP((cur) => (cur > 0 ? 1 : 0));
    const t = setTimeout(() => setP(0), 350);
    return () => clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => {
    function start() {
      if (timer.current) return;
      setP(0.08);
      timer.current = setInterval(() => setP((cur) => (cur >= 0.92 ? cur : cur + (0.92 - cur) * 0.08)), 120);
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      // Plain links to API/text routes do a full load; let the browser show its own spinner.
      if (/^\/(api|v1)\//.test(url.pathname) || /\.(xml|txt|csv|json)$/.test(url.pathname)) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("se:navigate-start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("se:navigate-start", start);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (p === 0) return null;
  return <div className="se-progress" style={{ transform: `scaleX(${p})`, opacity: p >= 1 ? 0 : 1 }} aria-hidden />;
}

/** Call before router.push() so programmatic navigations also show progress. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event("se:navigate-start"));
}

/** Put inside a <Link>: shows a spinner while that link's navigation is pending. */
export function LinkSpinner({ size = 13, className = "" }: { size?: number; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={size} className={className} /> : null;
}

/** Inside a <Link>: renders children only while that link is NOT pending (e.g. swap an arrow for the spinner). */
export function NotPending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? null : <>{children}</>;
}
