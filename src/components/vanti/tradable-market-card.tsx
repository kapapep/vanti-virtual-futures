import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/vanti/market-card";
import { TradeDialog } from "@/components/vanti/trade-dialog";
import { formatCents } from "@/lib/format";
import type { Market } from "@/lib/markets";

/** Market card with inline trade actions so discovery and trading live together. */
export function TradableMarketCard({ market }: { market: Market }) {
  const tradable = market.status === "active";

  return (
    <MarketCard
      market={market}
      actions={
        tradable ? (
          <>
            <TradeDialog
              market={market}
              side="yes"
              trigger={
                <Button
                  variant="outline"
                  className="min-h-11 border-positive/40 text-positive hover:bg-positive/10 hover:text-positive"
                >
                  Buy YES <span className="num ml-1">{formatCents(market.yesPrice)}</span>
                </Button>
              }
            />
            <TradeDialog
              market={market}
              side="no"
              trigger={
                <Button
                  variant="outline"
                  className="min-h-11 border-negative/40 text-negative hover:bg-negative/10 hover:text-negative"
                >
                  Buy NO <span className="num ml-1">{formatCents(market.noPrice)}</span>
                </Button>
              }
            />
          </>
        ) : null
      }
    />
  );
}
