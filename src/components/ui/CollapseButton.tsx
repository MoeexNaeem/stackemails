"use client";

import { Icon } from "@/components/ui/Icon";

/** Single icon button that collapses / expands a sidebar. */
export function CollapseButton({ collapsed, onClick, className = "" }: { collapsed: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-bg-hover hover:text-fg ${className}`}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Icon name="panel-left" size={17} />
    </button>
  );
}
