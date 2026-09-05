export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{ display: "block" }}
      >
        <rect width="32" height="32" rx="8" fill="url(#ns-grad)" />
        <path
          d="M8 21.5L16 9l8 12.5-8-4.2-8 4.2z"
          fill="white"
          fillOpacity="0.95"
        />
        <defs>
          <linearGradient id="ns-grad" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {withText && (
        <span className="text-[17px] font-semibold tracking-tight">NanoSend</span>
      )}
    </span>
  );
}
