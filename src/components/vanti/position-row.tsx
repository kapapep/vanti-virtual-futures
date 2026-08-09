import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  formatBalance,
  formatCents,
  formatContracts,
  formatDate,
  formatSignedBalance,
  formatSignedPercent,
} from "@/lib/format";
import type { PortfolioPosition } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

/**
 * A 2px probability bar split at the market's YES probability, with a thin tick
 * marking the holder's average entry so the move for or against them is obvious.
 */
function PositionBar({ position }: { position: PortfolioPosition }) {
  const yesPct = Math.min(99, Math.max(1, position.yesPrice * 100));
  const entryYes = position.side === "yes" ? position.avgPrice : 1 - position.avgPrice;
  const tickPct = Math.min(99.5, Math.max(0.5, entryYes * 100));

  return (
    <div className="relative w-full pt-2">
      <div className="flex h-[2px] w-full overflow-hidden rounded-full bg-negative">
        <div
          className="h-full bg-positive transition-[width] duration-300 ease-out"
          style={{ width: `${yesPct}%` }}
        />
      </div>
      <span
        className="absolute top-[3px] h-[8px] w-[1.5px] -translate-x-1/2 rounded-full bg-foreground/70"
        style={{ left: `${tickPct}%` }}
        aria-hidden
      />
    </div>
  );
}

export function PositionRow({
  position,
  onSell,
  selling,
}: {
  position: PortfolioPosition;
  onSell: (position: PortfolioPosition) => void;
  selling: boolean;
}) {
  const up = position.unrealized >= 0;

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-meta font-semibold uppercase",
                position.side === "yes"
                  ? "bg-positive-subtle text-positive"
                  : "bg-negative-subtle text-negative",
              )}
            >
              {position.side}
            </span>
            <span className="num text-meta text-muted-foreground">
              {formatDate(position.resolutionDate)}
            </span>
          </div>
          <Link
            to="/market/$marketId"
            params={{ marketId: position.marketId }}
            className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-foreground hover:text-accent-solid"
          >
            {position.question}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 @md:grid-cols-4 @3xl:w-[24rem] @3xl:shrink-0">
          <Stat label="Contracts" value={formatContracts(position.contracts)} />
          <Stat label="Avg" value={formatCents(position.avgPrice)} />
          <Stat label="Current" value={formatCents(position.currentPrice)} />
          <div>
            <p className="text-meta uppercase text-muted-foreground">Unrealized</p>
            <p
              className={cn("num text-sm font-semibold", up ? "text-positive" : "text-negative")}
            >
              {formatSignedBalance(position.unrealized)}
            </p>
            <p className={cn("num text-meta", up ? "text-positive" : "text-negative")}>
              {formatSignedPercent(position.unrealizedPct)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 @3xl:w-24 @3xl:shrink-0 @3xl:justify-end">
          <p className="num text-sm font-semibold text-foreground @3xl:hidden">
            {formatBalance(position.value)}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={selling}
            onClick={() => onSell(position)}
          >
            {selling ? "Selling…" : "Sell"}
          </Button>
        </div>
      </div>
      <PositionBar position={position} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-meta uppercase text-muted-foreground">{label}</p>
      <p className="num text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
