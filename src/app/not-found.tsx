import type { Metadata } from "next";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import MarketingNotFound from "@/app/(marketing)/not-found";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Global 404 (unmatched URLs) in the public-site shell. */
export default function NotFound() {
  return (
    <div className="mkt flex min-h-full flex-col">
      <Nav />
      <main id="main" className="flex-1"><MarketingNotFound /></main>
      <Footer />
    </div>
  );
}
