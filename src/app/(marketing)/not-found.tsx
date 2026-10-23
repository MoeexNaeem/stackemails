import Link from "next/link";

export default function MarketingNotFound() {
  return (
    <section className="m-container py-32 text-center">
      <p className="m-eyebrow">404</p>
      <h1 className="m-display mt-5 text-[44px] sm:text-[64px]">This page <span className="m-highlight">bounced.</span></h1>
      <p className="m-lead mx-auto mt-5 max-w-[460px]">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="m-btn m-btn-ink">Go home</Link>
        <Link href="/docs" className="m-btn m-btn-light">Read the docs</Link>
        <Link href="/blog" className="m-btn m-btn-light">Visit the blog</Link>
      </div>
    </section>
  );
}
