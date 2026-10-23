export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-[28px] font-normal tracking-[-0.02em] leading-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-fg-muted max-w-xl">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
