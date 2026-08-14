import { formatProbability } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VaneChevron } from "@/components/vanti/vane-chevron";

const TICKS = 60;

/**
 * The vane meter: 60 hairline ticks reading YES to the left and NO to the
 * right, with a single full-height blue tick marking the current probability.
 */
export function OddsTickRule({ price, className }: { price: number; className?: string }) {
  const pct = Math.min(0.99, Math.max(0.01, price));
  const markerIndex = Math.round(pct * (TICKS - 1));

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative flex h-5 items-end"
        style={{ gap: "3px" }}
        role="img"
        aria-label={`YES ${formatProbability(price)}, NO ${formatProbability(1 - price)}`}
      >
        {Array.from({ length: TICKS }, (_, i) => {
          if (i === markerIndex) {
            return (
              <div key={i} className="relative flex w-px justify-center">
                <span
                  className="block w-px"
                  style={{ height: 20, backgroundColor: "var(--vanti-blue)" }}
                />
                <VaneChevron
                  size={8}
                  className="absolute -top-1.5"
                  style={{ color: "var(--vanti-blue)" }}
                />
              </div>
            );
          }
          const isYes = i < markerIndex;
          return (
            <span
              key={i}
              className="block w-px shrink-0"
              style={{
                height: 12,
                backgroundColor: isYes ? "var(--vanti-yes)" : "var(--vanti-no)",
                opacity: isYes ? 0.55 : 0.35,
              }}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="vane-label vane-num" style={{ color: "var(--vanti-yes)" }}>
          YES {formatProbability(price)}
        </span>
        <span className="vane-label vane-num" style={{ color: "var(--vanti-no)" }}>
          NO {formatProbability(1 - price)}
        </span>
      </div>
    </div>
  );
}