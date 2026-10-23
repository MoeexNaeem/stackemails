import Script from "next/script";
import { site } from "@/lib/site";

/**
 * Google "Add as a preferred source" button (Search Central's official embed).
 * Readers who add Stack Emails see our articles more in Top Stories / Discover.
 * The deeplink fallback works without JavaScript.
 * https://developers.google.com/search/docs/appearance/preferred-sources
 */
export function PreferredSourceButton({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Script src="https://news.google.com/swg/js/v1/publisher.js" strategy="lazyOnload" />
      <div google-add-preferred-source-btn="" data-theme={theme} data-lang="en" />
      <noscript>
        <a href={`https://www.google.com/preferences/source?q=${site.domain}`} target="_blank" rel="noopener">Add Stack Emails as a preferred source on Google</a>
      </noscript>
    </div>
  );
}

/** Lightweight badge-style deeplink (for places where the JS button is too heavy, e.g. every article). */
export function PreferredSourceLink() {
  return (
    <a
      href={`https://www.google.com/preferences/source?q=${site.domain}`}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-medium transition hover:shadow-sm"
      style={{ borderColor: "var(--m-line)", color: "var(--m-head)", background: "var(--m-surface)" }}
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Add as a preferred source on Google
    </a>
  );
}
