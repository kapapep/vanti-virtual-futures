import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";

type ProbabilityBarProps = {
  /** Current YES price, 0.01–0.99. */
  price: number;
  /** Bar height in pixels. Cards use 4, market detail uses 12. */
  height?: number;
  /** Renders "YES 63¢" / "NO 37¢" at the ends. */
  showLabels?: boolean;
  className?: string;
};

/**
 * Vanti's signature element: a single horizontal bar split at the current YES
 * probability — green to the left, red to the right. The split animates when
 * the price changes.
 */
export function ProbabilityBar({
  price,
  height = 4,
  showLabels = false,
  className,
}: ProbabilityBarProps) {
  const pct = Math.min(99, Math.max(1, price * 100));

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex w-full overflow-hidden rounded-full bg-negative"
        style={{ height }}
        role="img"
        aria-label={`YES ${formatCents(price)}, NO ${formatCents(1 - price)}`}
      >
        <div
          className="h-full bg-positive transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabels ? (
        <div className="mt-2 flex items-baseline justify-between text-meta font-medium">
          <span className="num text-positive">YES {formatCents(price)}</span>
          <span className="num text-negative">NO {formatCents(1 - price)}</span>
        </div>
      ) : null}
    </div>
  );
}