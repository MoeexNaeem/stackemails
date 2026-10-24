import { LogoMark } from "@/components/Logo";

/**
 * Static, decorative rendition of the Stack Emails dashboard (Monera style)
 * used on marketing pages. Pure HTML/CSS - crisp at any size, no images.
 */
const BARS = [38, 55, 72, 46, 92, 18, 24];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROWS = [
  { to: "ada@lovelace.dev", subject: "Your login code: 482 913", status: "Delivered", c: "#34d399" },
  { to: "grace@cobol.io", subject: "Receipt for order #10482", status: "Delivered", c: "#34d399" },
  { to: "linus@kernel.org", subject: "Reset your password", status: "Opened", c: "#c6f04f" },
  { to: "margaret@apollo.space", subject: "Welcome to Acme", status: "Sent", c: "#b77fe0" },
];

export function DashboardMock() {
  return (
    <div className="m-mock select-none text-left" aria-hidden="true" style={{ background: "#19181b", color: "#ededef", fontFamily: "var(--font-inter)" }}>
      <div className="flex">
        <aside className="hidden w-[190px] shrink-0 border-r p-4 sm:block" style={{ background: "#141415", borderColor: "#27272d" }}>
          <div className="mb-6 flex items-center gap-2 text-[13px] font-medium">
            <LogoMark size={20} />
            Stack Emails
          </div>
          {["Overview", "Emails", "Templates", "Audience", "Broadcasts", "Automations", "Metrics", "Domains"].map((l, i) => (
            <div key={l} className="relative mb-1 rounded-lg px-2.5 py-1.5 text-[12px]" style={{ background: i === 0 ? "#26262b" : "transparent", color: i === 0 ? "#ededef" : "#8a8a94" }}>
              {i === 0 && <span className="absolute -left-4 top-1 bottom-1 w-[3px] rounded-r" style={{ background: "#b77fe0" }} />}
              {l}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[19px]">Overview</p>
            <span className="rounded-full border px-3 py-1 text-[11px]" style={{ borderColor: "#35353c", color: "#a1a1aa" }}>Acme Inc.</span>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Emails sent", "128,402", "+12.4%", true],
              ["Delivery rate", "99.4%", "+0.3%", true],
              ["Open rate", "48.1%", "+2.1%", true],
              ["Bounce rate", "0.42%", "-0.1%", true],
            ].map(([l, v, d]) => (
              <div key={l as string} className="rounded-2xl border p-3" style={{ background: "#1e1e22", borderColor: "#27272d" }}>
                <p className="text-[10.5px]" style={{ color: "#a1a1aa" }}>{l}</p>
                <p className="mt-1 text-[17px]">{v} <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9.5px]" style={{ background: "rgba(34,197,94,.16)", color: "#4ade80" }}>{d}</span></p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border p-4" style={{ background: "#1e1e22", borderColor: "#27272d" }}>
              <p className="mb-3 text-[13px]">Sending volume <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9.5px]" style={{ background: "rgba(34,197,94,.16)", color: "#4ade80" }}>+12.4%</span></p>
              <div className="flex h-[120px] items-end gap-3">
                {BARS.map((h, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    {/* Bars need a fixed-height track: a % height inside an auto-height column collapses to 0. */}
                    <div className="flex w-full min-h-0 flex-1 items-end justify-center">
                      <div className="m-grow w-full max-w-[22px] rounded-full" style={{ "--i": i, height: `${h}%`, background: i === 4 ? "linear-gradient(180deg,#d9b3f0,#b77fe0)" : "linear-gradient(180deg,rgba(183,127,224,.55),rgba(183,127,224,.15))", boxShadow: i === 4 ? "0 0 22px rgba(183,127,224,.55)" : undefined } as React.CSSProperties} />
                    </div>
                    <span className="text-[9.5px]" style={{ color: "#71717a" }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border p-4" style={{ background: "#1e1e22", borderColor: "#27272d" }}>
              <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] shrink-0 -rotate-90">
                <circle cx="50" cy="50" r="34" fill="none" stroke="#26262b" strokeWidth="22" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#c6f04f" strokeWidth="22" strokeDasharray="160 214" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#b77fe0" strokeWidth="22" strokeDasharray="38 214" strokeDashoffset="-161" />
                <circle cx="50" cy="50" r="34" fill="none" stroke="#fb6f8b" strokeWidth="22" strokeDasharray="8 214" strokeDashoffset="-200" />
              </svg>
              <div className="space-y-1.5 text-[11px]" style={{ color: "#a1a1aa" }}>
                <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: "#c6f04f" }} />Delivered 75%</p>
                <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: "#b77fe0" }} />Opened 18%</p>
                <p><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: "#fb6f8b" }} />Bounced 0.4%</p>
              </div>
            </div>
          </div>
          <div className="mt-3 hidden rounded-2xl border md:block" style={{ background: "#1e1e22", borderColor: "#27272d" }}>
            <p className="px-4 pt-3 pb-1 text-[13px]">Recent activity</p>
            {ROWS.map((r) => (
              <div key={r.to} className="grid grid-cols-[1.2fr_1.6fr_auto] items-center gap-3 border-t px-4 py-2 text-[11px]" style={{ borderColor: "#27272d" }}>
                <span className="truncate" style={{ color: "#a1a1aa" }}>{r.to}</span>
                <span className="truncate">{r.subject}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ color: r.c, background: `${r.c}24` }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
