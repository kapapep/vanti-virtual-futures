import type { ReactNode } from "react";

import { VantiMark } from "@/components/vanti/vanti-mark";
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
      <VantiMark size={28} variant="current" className="mx-auto mb-3 text-label3" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
