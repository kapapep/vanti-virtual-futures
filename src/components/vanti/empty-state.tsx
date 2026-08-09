import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Consistent, copy-first empty state — never a blank screen. */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
