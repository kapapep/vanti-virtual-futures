import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, TrendingDown, TrendingUp, Users } from "lucide-react";

import { CategoryIcon } from "@/components/vanti/category-icon";
import { MarketSparkline } from "@/components/vanti/market-sparkline";
import { ProbabilityBar } from "@/components/vanti/probability-bar";
import { formatCents, formatCount, formatDate, formatDelta, formatVolume } from "@/lib/format";
import type { Market } from "@/lib/markets";
import { cn } from "@/lib/utils";

export function MarketCard({ market, actions }: { market: Market; actions?: ReactNode }) {
  const up = market.change24h >= 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent-solid/50">
      <Link
        to="/market/$marketId"
        params={{ marketId: market.id }}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ProbabilityBar price={market.yesPrice} height={4} className="[&>div]:rounded-none" />

        <div className={cn("flex flex-1 flex-col gap-3 p-4", actions && "pb-0")}>
          <div className="flex items-center gap-2 text-meta text-muted-foreground">
            {market.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-medium">
                <CategoryIcon name={market.category.icon} className="size-3" />
                {market.category.name}
              </span>
            ) : null}
            {market.status !== "active" ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium uppercase text-secondary-foreground">
                {market.status === "resolved" ? `Resolved ${market.outcome?.toUpperCase()}` : market.status}
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-3 text-sm font-semibold leading-snug text-foreground group-hover:text-accent-solid">
            {market.question}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="num text-lg font-semibold text-positive">
                {formatCents(market.yesPrice)}
                <span className="ml-1 text-meta font-medium text-muted-foreground">YES</span>
              </span>
              <span className="num text-lg font-semibold text-negative">
                {formatCents(market.noPrice)}
                <span className="ml-1 text-meta font-medium text-muted-foreground">NO</span>
              </span>
            </div>
            <div className="w-20 shrink-0">
              <MarketSparkline points={market.spark} up={up} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-meta text-muted-foreground">
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
            <span className="num inline-flex items-center gap-1">
              <Users className="size-3" />
              {formatCount(market.traderCount)}
            </span>
            <span className="num inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatDate(market.resolutionDate)}
            </span>
          </div>
        </div>
      </Link>
      {actions ? (
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3">{actions}</div>
      ) : null}
    </div>
  );
}
