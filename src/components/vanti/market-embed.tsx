import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProbabilityBar } from "@/components/vanti/probability-bar";
import { TradeDialog } from "@/components/vanti/trade-dialog";
import { formatProbability, formatDelta, formatVolume } from "@/lib/format";
import { marketsQuery } from "@/lib/markets";
import { cn } from "@/lib/utils";

/** Compact market card embedded inside a post, with inline trade actions. */
export function MarketEmbed({ marketId }: { marketId: string }) {
  const markets = useQuery(marketsQuery);
  const market = (markets.data ?? []).find((m) => m.id === marketId);

  if (markets.isPending && !market) return <Skeleton className="h-28 w-full rounded-lg" />;
  if (!market) return null;

  const up = market.change24h >= 0;
  const tradable = market.status === "active";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ProbabilityBar price={market.yesPrice} height={4} className="[&>div]:rounded-none" />
      <div className="space-y-3 p-3">
        <Link
          to="/market/$marketId"
          params={{ marketId: market.id }}
          className="block text-sm font-medium leading-snug text-foreground hover:text-accent-solid"
        >
          {market.question}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
          <span
            className={cn(
              "num inline-flex items-center gap-1 font-medium",
              up ? "text-positive" : "text-negative",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatDelta(market.change24h)} 24h
          </span>
          <span className="num">{formatVolume(market.volume)} vol</span>
          {!tradable ? (
            <span className="font-medium uppercase">
              {market.status === "resolved" ? `Resolved ${market.outcome?.toUpperCase()}` : market.status}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TradeDialog
            market={market}
            side="yes"
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={!tradable}
                className="border-positive/40 text-positive hover:bg-positive-subtle hover:text-positive"
              >
                Trade YES <span className="num">{formatProbability(market.yesPrice)}</span>
              </Button>
            }
          />
          <TradeDialog
            market={market}
            side="no"
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={!tradable}
                className="border-negative/40 text-negative hover:bg-negative-subtle hover:text-negative"
              >
                Trade NO <span className="num">{formatProbability(market.noPrice)}</span>
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
