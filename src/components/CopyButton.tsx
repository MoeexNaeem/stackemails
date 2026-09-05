"use client";

import { useState } from "react";

export function CopyButton({
  value,
  className = "",
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <button type="button" onClick={copy} className={`btn btn-secondary ${className}`}>
      {copied ? "Copied!" : label}
    </button>
  );
}
