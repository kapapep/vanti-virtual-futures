import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePoolSheet } from "@/components/vanti/create-pool-sheet";
import { PoolCard } from "@/components/vanti/pool-card";
import type { Market } from "@/lib/markets";
import { marketPoolsQuery } from "@/lib/pools";

/** Open and settled pools backing this market, plus the create entry point. */
export function MarketPools({ market }: { market: Market }) {
  const pools = useQuery(marketPoolsQuery(market.id));
  const list = pools.data ?? [];
  const funding = list.filter((s) => s.status === "open");
  const rest = list.filter((s) => s.status !== "open");

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">Pools</h2>
          <p className="text-meta text-muted-foreground">
            Pool virtual currency and split winnings by shares owned.
          </p>
        </div>
        {market.status === "active" ? (
          <CreatePoolSheet
            market={market}
            trigger={
              <Button size="sm" className="min-h-11 font-extrabold">
                <Plus className="size-4" />
                Start a pool
              </Button>
            }
          />
        ) : null}
      </div>

      {pools.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          No pools on this market yet. Start the first pool.
        </p>
      ) : (
        <div className="space-y-2">
          {[...funding, ...rest].map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      )}
    </section>
  );
}