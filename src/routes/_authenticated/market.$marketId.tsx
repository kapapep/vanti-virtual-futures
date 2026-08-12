import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/vanti/category-icon";
import { PriceChart } from "@/components/vanti/price-chart";
import { MarketDiscussion } from "@/components/vanti/market-discussion";
import { MarketSyndicates } from "@/components/vanti/market-syndicates";
import { ProbabilityBar } from "@/components/vanti/probability-bar";
import { TradePanel } from "@/components/vanti/trade-panel";
import { TradeDialog } from "@/components/vanti/trade-dialog";
import { useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCents,
  formatCount,
  formatDate,
  formatDelta,
  formatVolume,
} from "@/lib/format";
import { marketQuery, marketTradesQuery, watchlistQuery } from "@/lib/markets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/market/$marketId")({
  head: () => ({
    meta: [
      { title: "Market — Vanti" },
      {
        name: "description",
        content: "Live YES/NO pricing, probability history and resolution details for a Vanti market.",
      },
      { property: "og:title", content: "Market — Vanti" },
      {
        property: "og:description",
        content: "Live YES/NO pricing, probability history and resolution details for a Vanti market.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketDetailPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Market not found.</p>,
});

function MarketDetailPage() {
  const { marketId } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const market = useQuery(marketQuery(marketId));
  const trades = useQuery(marketTradesQuery(marketId, user?.id));
  const watchlist = useQuery(watchlistQuery(user?.id));

  const watched = (watchlist.data ?? []).includes(marketId);

  const toggleWatch = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to use your watchlist.");
      if (watched) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("market_id", marketId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("watchlist")
          .insert({ market_id: marketId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(watched ? "Removed from watchlist" : "Added to watchlist");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (market.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }
  if (!market.data) return <p className="text-sm text-muted-foreground">Market not found.</p>;

  const m = market.data;
  const up = m.change24h >= 0;

  return (
    <div className="space-y-6 pb-32 lg:pb-0">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
          {m.category ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-medium">
              <CategoryIcon name={m.category.icon} className="size-3" />
              {m.category.name}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-medium uppercase",
              m.status === "active"
                ? "bg-accent-subtle text-accent-solid"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {m.status === "resolved" ? `Resolved ${m.outcome?.toUpperCase()}` : m.status}
          </span>
          <span className="num">Resolves {formatDate(m.resolutionDate)}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="max-w-3xl text-xl font-semibold leading-snug text-foreground sm:text-2xl">
            {m.question}
          </h1>
          <Button
            variant={watched ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggleWatch.mutate()}
            disabled={toggleWatch.isPending}
          >
            <Star className={cn("size-4", watched && "fill-current text-accent-solid")} />
            {watched ? "Watching" : "Watchlist"}
          </Button>
        </div>

        <div className="flex items-baseline gap-4">
          <span className="num text-4xl font-semibold tracking-tight text-positive">
            {formatCents(m.yesPrice)}
          </span>
          <span
            className={cn(
              "num inline-flex items-center gap-1 text-sm font-medium",
              up ? "text-positive" : "text-negative",
            )}
          >
            {up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {formatDelta(m.change24h)} 24h
          </span>
        </div>

        <ProbabilityBar price={m.yesPrice} height={12} showLabels />
      </header>

      <div className="@container">
      <div className="grid gap-6 @[600px]:grid-cols-[1fr_280px] @[900px]:grid-cols-[220px_1fr_300px]">
        <aside className="order-3 space-y-4 @[600px]:col-span-2 @[600px]:grid @[600px]:grid-cols-2 @[600px]:items-start @[600px]:gap-4 @[600px]:space-y-0 @[900px]:order-1 @[900px]:col-span-1 @[900px]:block @[900px]:space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-meta font-semibold uppercase text-muted-foreground">Market info</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Volume</dt>
                <dd className="num font-medium text-foreground">{formatVolume(m.volume)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Traders</dt>
                <dd className="num font-medium text-foreground">{formatCount(m.traderCount)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">YES</dt>
                <dd className="num font-medium text-positive">{formatCents(m.yesPrice)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">NO</dt>
                <dd className="num font-medium text-negative">{formatCents(m.noPrice)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Opened</dt>
                <dd className="num font-medium text-foreground">{formatDate(m.createdAt)}</dd>
              </div>
            </dl>
          </div>
          {m.resolutionSource ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-meta font-semibold uppercase text-muted-foreground">Source</h2>
              <p className="mt-2 text-sm text-foreground">{m.resolutionSource}</p>
            </div>
          ) : null}
        </aside>

        <div className="order-1 min-w-0 space-y-6 @[900px]:order-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <PriceChart points={m.spark} />
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">About this market</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {m.description ?? "No description provided."}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Resolution criteria</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {m.resolutionCriteria ?? "No criteria provided."}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Your recent activity</h2>
            {(trades.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                You haven't traded this market yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(trades.data ?? []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span
                      className={cn(
                        "font-medium uppercase",
                        t.side === "yes" ? "text-positive" : "text-negative",
                      )}
                    >
                      {t.action} {t.side}
                    </span>
                    <span className="num text-muted-foreground">
                      {formatCount(t.contracts)} @ {formatCents(t.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MarketDiscussion marketId={m.id} />

          <MarketSyndicates market={m} />
        </div>

        <div className="order-2 hidden @[600px]:block @[900px]:order-3">
          <div className="sticky top-6">
            <TradePanel market={m} />
          </div>
        </div>
      </div>

      {/* Mobile: the primary trade action stays in thumb reach and opens the full panel. */}
      <div className="fixed inset-x-0 bottom-16 z-20 grid grid-cols-2 gap-2 border-t border-border bg-background p-3 @[600px]:hidden">
        <TradeDialog
          market={m}
          side="yes"
          trigger={
            <Button className="min-h-12 w-full bg-positive text-base font-semibold text-positive-foreground hover:bg-positive/90">
              Buy YES <span className="num">{formatCents(m.yesPrice)}</span>
            </Button>
          }
        />
        <TradeDialog
          market={m}
          side="no"
          trigger={
            <Button className="min-h-12 w-full bg-negative text-base font-semibold text-negative-foreground hover:bg-negative/90">
              Buy NO <span className="num">{formatCents(m.noPrice)}</span>
            </Button>
          }
        />
      </div>
      </div>
    </div>
  );
}