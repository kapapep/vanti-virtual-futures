import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSyndicateSheet } from "@/components/vanti/create-syndicate-sheet";
import { SyndicateCard } from "@/components/vanti/syndicate-card";
import type { Market } from "@/lib/markets";
import { marketSyndicatesQuery } from "@/lib/syndicates";

/** Open and settled pools backing this market, plus the create entry point. */
export function MarketSyndicates({ market }: { market: Market }) {
  const syndicates = useQuery(marketSyndicatesQuery(market.id));
  const list = syndicates.data ?? [];
  const funding = list.filter((s) => s.status === "open");
  const rest = list.filter((s) => s.status !== "open");

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">Syndicates</h2>
          <p className="text-meta text-muted-foreground">
            Pool virtual currency and split winnings by shares owned.
          </p>
        </div>
        {market.status === "active" ? (
          <CreateSyndicateSheet
            market={market}
            trigger={
              <Button size="sm" className="min-h-11 font-extrabold">
                <Plus className="size-4" />
                Start a syndicate
              </Button>
            }
          />
        ) : null}
      </div>

      {syndicates.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          No syndicates on this market yet. Start the first pool.
        </p>
      ) : (
        <div className="space-y-2">
          {[...funding, ...rest].map((syndicate) => (
            <SyndicateCard key={syndicate.id} syndicate={syndicate} />
          ))}
        </div>
      )}
    </section>
  );
}