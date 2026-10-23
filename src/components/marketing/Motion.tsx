"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window { __mMotion?: boolean }
}

/**
 * Calls `cb` once `el` is in (or above) the viewport. IntersectionObserver
 * alone misses elements the page jumps past (anchor links, Page Down, scroll
 * restoration), so a throttled scroll check backs it up.
 */
function whenSeen(el: Element, cb: () => void, threshold = 0.12): () => void {
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    cleanup();
    cb();
  };
  const check = () => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) fire();
  };
  const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && fire(), { threshold });
  io.observe(el);
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    setTimeout(() => {
      ticking = false;
      check();
    }, 100);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const cleanup = () => {
    io.disconnect();
    window.removeEventListener("scroll", onScroll);
  };
  check();
  return cleanup;
}

/**
 * Runs once in the marketing layout:
 *  - reveals `[data-reveal]` elements as they scroll into view (adds `.is-in`)
 *  - feeds the pointer position to `.m-spot` cards for the cursor glow
 * Elements added by client navigation are picked up via MutationObserver.
 */
export function MotionController() {
  const pathname = usePathname();

  useEffect(() => {
    window.__mMotion = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups = new Map<Element, () => void>();
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        if (cleanups.has(el)) return;
        if (reduce) {
          el.classList.add("is-in");
          return;
        }
        cleanups.set(el, whenSeen(el, () => el.classList.add("is-in")));
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as Element | null)?.closest?.(".m-spot") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${ev.clientX - r.left}px`);
      card.style.setProperty("--my", `${ev.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      mo.disconnect();
      cleanups.forEach((c) => c());
      document.removeEventListener("pointermove", onMove);
    };
  }, [pathname]);

  return null;
}

/**
 * Counts up to the number at the start of `value` ("3,000", "6×", "30 days")
 * when it scrolls into view. It always shows the real value unless the
 * animation is actually running, so it can never get stuck at 0.
 */
export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const m = value.match(/^([\d,.]+)(.*)$/);
  const target = m ? Number(m[1].replace(/,/g, "")) : NaN;
  const suffix = m ? m[2] : "";
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !Number.isFinite(target) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already past it on load (e.g. restored scroll position): keep the final value.
    if (el.getBoundingClientRect().bottom < 0) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const fmt = (n: number) => Math.round(n).toLocaleString("en-US") + suffix;
    const stop = whenSeen(el, () => {
      const start = Date.now();
      setShown(fmt(0));
      // setInterval rather than rAF: it still finishes in background tabs.
      timer = setInterval(() => {
        const p = Math.min(1, (Date.now() - start) / duration);
        setShown(p >= 1 ? value : fmt(target * (1 - Math.pow(1 - p, 3))));
        if (p >= 1) clearInterval(timer);
      }, 16);
    }, 0.4);
    return () => {
      stop();
      if (timer) clearInterval(timer);
      setShown(value);
    };
  }, [target, suffix, duration, value]);

  return <span ref={ref} aria-label={value}>{shown}</span>;
}
