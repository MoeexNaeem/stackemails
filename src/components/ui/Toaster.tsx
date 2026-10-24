"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";

/**
 * App-wide toast host. Follows the visible theme: an explicit data-theme wins;
 * otherwise the public site follows the OS and the dashboard defaults to dark.
 */
export function Toaster() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "light" || attr === "dark") return setTheme(attr);
      const marketing = !!document.querySelector(".mkt");
      setTheme(marketing && !window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark");
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", read);
    };
  }, [pathname]);

  return <GooeyToaster position="bottom-right" theme={theme} preset="smooth" closeOnEscape showTimestamp={false} visibleToasts={4} />;
}
