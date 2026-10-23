import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { MotionController } from "@/components/marketing/Motion";
import { REVEAL_BOOT } from "@/lib/motion-boot";

/** Public site shell: Ghost × Ready canvas, independent of the dashboard theme. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mkt flex min-h-full flex-col">
      {/* Runs before first paint so scroll-reveal content never flashes. */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT }} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--m-surface)] focus:text-[var(--m-head)] focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
      <Nav />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <MotionController />
    </div>
  );
}
