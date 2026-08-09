import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/vanti/empty-state";
import { MarketCard } from "@/components/vanti/market-card";
import { useSession } from "@/hooks/use-vanti-session";
import { marketsQuery, watchlistQuery } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Vanti" },
      { name: "description", content: "The Vanti markets you're tracking, with live prices." },
      { property: "og:title", content: "Watchlist — Vanti" },
      {
        property: "og:description",
        content: "The Vanti markets you're tracking, with live prices.",
      },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user } = useSession();
  const { data: saved = [], isPending } = useQuery(watchlistQuery(user?.id));
  const { data: markets = [] } = useQuery(marketsQuery);

  const savedSet = new Set(saved);
  const watched = markets.filter((m) => savedSet.has(m.id));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          Probability, 24h movement and volume for the markets you're tracking.
        </p>
      </header>

      {isPending ? (
        <EmptyState title="Loading your watchlist…" />
      ) : watched.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {watched.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Save markets to track them here."
          action={
            <Button asChild size="sm">
              <Link to="/markets">Browse markets</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
