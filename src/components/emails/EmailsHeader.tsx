import Link from "next/link";

/** Shared header for Emails: title, Sending / Receiving tabs, Suppressions link, actions. */
export function EmailsHeader({ tab, actions }: { tab: "sending" | "receiving" | "suppressions"; actions?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-5">Emails</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="tabs" aria-label="Emails">
          <Link href="/emails" className="tab" data-active={tab === "sending"}>Sending</Link>
          <Link href="/emails/receiving" className="tab" data-active={tab === "receiving"}>Receiving</Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Link href="/emails/suppressions" className="btn btn-secondary" data-active={tab === "suppressions"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.7 5.7l12.6 12.6" /></svg>
            Suppressions
          </Link>
        </div>
      </div>
    </div>
  );
}
