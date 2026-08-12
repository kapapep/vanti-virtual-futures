import { formatBalance, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Funding progress toward a syndicate's target stake. */
export function SyndicateProgress({
  raised,
  target,
  height = 6,
  className,
}: {
  raised: number;
  target: number;
  height?: number;
  className?: string;
}) {
  const ratio = target > 0 ? Math.min(1, raised / target) : 0;
  const full = ratio >= 1;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="w-full overflow-hidden rounded-full bg-secondary"
        style={{ height }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="Funding progress"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-200",
            full ? "bg-positive" : "bg-accent-solid",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 text-meta">
        <span className="num font-medium text-foreground">
          {formatBalance(raised)}{" "}
          <span className="font-normal text-muted-foreground">of {formatBalance(target)}</span>
        </span>
        <span className={cn("num font-medium", full ? "text-positive" : "text-muted-foreground")}>
          {formatPercent(ratio)}
        </span>
      </div>
    </div>
  );
}