/** Loading placeholders shaped like the real pages, so navigation feels instant. */

function Bar({ w, h = 12, className = "" }: { w: string | number; h?: number; className?: string }) {
  return <div className={`skel ${className}`} style={{ width: w, height: h }} />;
}

export function PageHeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Bar w={220} h={28} />
        <Bar w={320} h={12} />
      </div>
      {action && <Bar w={130} h={38} className="!rounded-full" />}
    </div>
  );
}

export function StatRowSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card space-y-4 p-5">
          <Bar w="45%" />
          <Bar w="60%" h={26} />
          <Bar w="35%" h={10} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5, filters = true }: { rows?: number; cols?: number; filters?: boolean }) {
  return (
    <div className="space-y-4">
      {filters && (
        <div className="flex flex-wrap gap-2">
          <Bar w="100%" h={40} className="!rounded-full max-w-[520px] flex-1" />
          <Bar w={160} h={40} className="!rounded-full" />
          <Bar w={160} h={40} className="!rounded-full" />
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="flex gap-6 border-b border-border px-5 py-4">
          {Array.from({ length: cols }, (_, i) => <Bar key={i} w={i === 0 ? "22%" : "12%"} h={10} />)}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6 border-b border-border px-5 py-4 last:border-0">
            {Array.from({ length: cols }, (_, i) => <Bar key={i} w={i === 0 ? "22%" : `${8 + ((r + i) % 4) * 3}%`} h={i === 0 ? 13 : 11} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCardSkeleton({ h = 240 }: { h?: number }) {
  return (
    <div className="card p-5">
      <Bar w={160} h={14} className="mb-5" />
      <div className="flex items-end gap-3" style={{ height: h }}>
        {[38, 62, 48, 80, 56, 30, 70, 44, 66, 52].map((v, i) => (
          <div key={i} className="skel flex-1 !rounded-full" style={{ height: `${v}%` }} />
        ))}
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCardSkeleton />
        <div className="card flex items-center justify-center p-5">
          <div className="skel !rounded-full" style={{ width: 170, height: 170 }} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <TableSkeleton rows={5} filters={false} />
        <div className="card space-y-4 p-6">
          <Bar w="40%" h={16} />
          {Array.from({ length: 4 }, (_, i) => <Bar key={i} w="100%" h={14} />)}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Bar w={90} h={12} />
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card space-y-3 p-4"><Bar w="50%" h={10} /><Bar w="75%" h={14} /></div>
        ))}
      </div>
      <div className="card space-y-3 p-6">
        {Array.from({ length: 7 }, (_, i) => <Bar key={i} w={`${60 + ((i * 13) % 40)}%`} h={12} />)}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="card space-y-4 p-6">
          <Bar w={180} h={16} />
          <Bar w="70%" h={11} />
          <Bar w="100%" h={40} className="!rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Public-site placeholder (hero + content blocks). */
export function MarketingSkeleton() {
  return (
    <div className="m-container pt-32 pb-24" aria-busy="true" aria-label="Loading">
      <Bar w={90} h={12} />
      <Bar w="min(640px, 90%)" h={52} className="mt-6" />
      <Bar w="min(420px, 70%)" h={52} className="mt-3" />
      <Bar w="min(560px, 85%)" h={16} className="mt-8" />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Bar key={i} w="100%" h={180} className="!rounded-2xl" />)}
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="m-container max-w-[760px] pt-32 pb-24" aria-busy="true" aria-label="Loading">
      <Bar w={120} h={12} />
      <Bar w="95%" h={44} className="mt-6" />
      <Bar w="70%" h={44} className="mt-3" />
      <Bar w="60%" h={14} className="mt-8" />
      <div className="mt-12 space-y-3">
        {Array.from({ length: 10 }, (_, i) => <Bar key={i} w={`${70 + ((i * 17) % 30)}%`} h={13} />)}
      </div>
    </div>
  );
}
