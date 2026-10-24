"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails. Keeps its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#19181b", color: "#ededef", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>Stack Emails hit an unexpected error. Please try again.</p>
          {error.digest && <p style={{ marginTop: 8, opacity: 0.5, fontSize: 12, fontFamily: "monospace" }}>Ref: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 20, height: 40, padding: "0 20px", borderRadius: 999, background: "#f2f2f3", color: "#141415", border: 0, fontWeight: 500, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
