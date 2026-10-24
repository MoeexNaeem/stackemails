"use client";

import { useCallback, useEffect, useState } from "react";

/** Remembered collapsed/expanded state for a sidebar (per browser). */
export function useCollapsed(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(key) === "1");
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(key, c ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  }, [key]);
  return [collapsed, toggle];
}
