import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/vanti/empty-state";
import {
  formatBalance,
  formatCents,
  formatContracts,
  formatDateTime,
} from "@/lib/format";
import type { PortfolioTrade } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export function TradeHistoryList({
  trades,
  emptyCopy,
}: {
  trades: PortfolioTrade[];
  emptyCopy: string;
}) {
  if (!trades.length) return <EmptyState title={emptyCopy} />;

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {trades.map((trade) => {
        const settled = trade.marketStatus === "resolved" && trade.marketOutcome;
        const won = settled ? trade.side === trade.marketOutcome : null;
        return (
        <div
          key={trade.id}
          className="relative flex flex-col gap-2 px-4 py-3 @md:flex-row @md:items-center @md:justify-between"
        >
          {won !== null ? (
            <span
              aria-label={won ? "Won prediction" : "Lost prediction"}
              className={cn(
                "absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-sm text-[10px] font-bold leading-none",
                won ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative",
              )}
            >
              {won ? "W" : "L"}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-meta font-semibold uppercase",
                  trade.action === "buy"
                    ? "bg-accent-subtle text-accent-solid"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {trade.action}
              </span>
              <span
                className={cn(
                  "text-meta font-semibold uppercase",
                  trade.side === "yes" ? "text-positive" : "text-negative",
                )}
              >
                {trade.side}
              </span>
              <span className="num text-meta text-muted-foreground">
                {formatDateTime(trade.createdAt)}
              </span>
            </div>
            <Link
              to="/market/$marketId"
              params={{ marketId: trade.marketId }}
              className="mt-1 line-clamp-2 block text-sm font-medium text-foreground hover:text-accent-solid"
            >
              {trade.question}
            </Link>
          </div>
          <div className="flex items-center gap-6 @md:shrink-0">
            <div className="text-right">
              <p className="text-meta uppercase text-muted-foreground">Contracts</p>
              <p className="num text-sm font-medium text-foreground">
                {formatContracts(trade.contracts)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-meta uppercase text-muted-foreground">Price</p>
              <p className="num text-sm font-medium text-foreground">{formatCents(trade.price)}</p>
            </div>
            <div className="text-right">
              <p className="text-meta uppercase text-muted-foreground">Total</p>
              <p className="num text-sm font-semibold text-foreground">
                {formatBalance(trade.total)}
              </p>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
