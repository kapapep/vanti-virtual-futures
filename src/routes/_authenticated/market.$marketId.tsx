import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Star, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/vanti/category-icon";
import { MarketChart, type MarketTimeframe } from "@/components/MarketChart";
import { MarketDiscussion } from "@/components/vanti/market-discussion";
import { MarketPools } from "@/components/vanti/market-pools";
import { ProbabilityBar } from "@/components/vanti/probability-bar";
import { VaneChevron } from "@/components/vanti/vane-chevron";
import { TradePanel } from "@/components/vanti/trade-panel";
import { TradeDialog } from "@/components/vanti/trade-dialog";
import { useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import {
  formatProbability,
  formatCount,
  formatDate,
  formatDelta,
  formatVolume,
} from "@/lib/format";
import { marketQuery, marketTradesQuery, watchlistQuery } from "@/lib/markets";
import { trendColor, trendDirection } from "@/lib/market-trend";
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
  const [timeframe, setTimeframe] = useState<MarketTimeframe>("1W");

  const points = market.data?.spark ?? [];
  const windowed = useMemo(() => {
    const minutes: Record<MarketTimeframe, number | null> = {
      LIVE: 60,
      "1D": 1440,
      "1W": 10080,
      "1M": 43200,
      ALL: null,
    };
    const span = minutes[timeframe];
    const source = span ? points.filter((p) => p.t >= Date.now() - span * 60 * 1000) : points;
    const series = source.length >= 2 ? source : points.slice(-2);
    return {
      yes: series.map((p) => ({ time: p.t / 1000, value: Number((p.price * 100).toFixed(1)) })),
    };
  }, [points, timeframe]);

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
  const direction = trendDirection(m.change24h);

  return (
    <div
      className="space-y-4 pt-[calc(var(--topbar-h)+env(safe-area-inset-top))] @[600px]:space-y-6 lg:pt-0"
      style={{
        // Content clears the sticky top bar and ends above the fixed buy bar +
        // tab bar, so the title and the last card are never clipped.
        scrollMarginTop: "calc(var(--topbar-h) + env(safe-area-inset-top))",
        paddingBottom:
          "calc(var(--buybar-h) + var(--tabbar-h) + 24px + env(safe-area-inset-bottom))",
      }}
    >
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
          <span
            className="vane-num text-4xl font-extrabold"
            style={{ color: "var(--vanti-yes)" }}
          >
            {formatProbability(m.yesPrice)}
          </span>
          <span
            className={cn(
              "vane-num inline-flex items-center gap-1 text-sm font-medium",
            )}
            style={{ color: trendColor(direction) }}
          >
            {direction === "up" ? <TrendingUp className="size-4" /> : null}
            {direction === "down" ? <TrendingDown className="size-4" /> : null}
            {formatDelta(m.change24h)} 24h
          </span>
        </div>

        <ProbabilityBar price={m.yesPrice} height={8} showLabels />
      </header>

      <div className="@container -mt-2">
      <div className="grid gap-4 @[600px]:gap-6 @[600px]:grid-cols-[1fr_280px] @[900px]:grid-cols-[220px_1fr_300px]">
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
                <dd className="num font-medium text-positive">{formatProbability(m.yesPrice)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">NO</dt>
                <dd className="num font-medium text-negative">{formatProbability(m.noPrice)}</dd>
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
          <MarketChart
            yesData={windowed.yes}
            currentYes={m.yesPrice * 100}
            volume={m.volume}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />

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
                      {formatCount(t.contracts)} @ {formatProbability(t.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MarketDiscussion marketId={m.id} />

          <MarketPools market={m} />
        </div>

        <div className="order-2 hidden @[600px]:block @[900px]:order-3">
          <div className="sticky top-6">
            <TradePanel market={m} />
          </div>
        </div>
      </div>

      {/* Mobile: the primary trade action stays in thumb reach and opens the full panel. */}
      <div
        className="pointer-events-auto fixed inset-x-0 z-30 flex items-stretch border-t border-border p-3 @[600px]:hidden"
        style={{
          backgroundColor: "var(--vanti-ink)",
          bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom))",
        }}
      >
        <TradeDialog
          market={m}
          side="yes"
          trigger={<VaneBuyButton side="yes" price={m.yesPrice} />}
        />
        <VaneDivider />
        <TradeDialog
          market={m}
          side="no"
          trigger={<VaneBuyButton side="no" price={m.noPrice} />}
        />
      </div>
      </div>
    </div>
  );
}

/** Outlined buy button that floods to its solid colour on press. */
function VaneBuyButton({ side, price }: { side: "yes" | "no"; price: number }) {
  const color = side === "yes" ? "var(--vanti-yes)" : "var(--vanti-no)";
  return (
    <Button
      variant="ghost"
      className={cn(
        "vane-buy min-h-12 flex-1 justify-between rounded-xl px-3 text-[15px] font-semibold",
        "transition-colors duration-[120ms] ease-out",
      )}
      style={{ ["--vane-c" as string]: color }}
    >
      <span className="uppercase tracking-[0.06em]">Buy {side}</span>
      <span className="vane-buy-pill vane-num rounded-full px-2 py-0.5 text-[13px]">
        {formatProbability(price)}
      </span>
    </Button>
  );
}

/** Hairline divider between the two buy buttons, notched with a vane chevron. */
function VaneDivider() {
  return (
    <div className="relative mx-2 flex w-px items-center justify-center self-stretch">
      <span className="absolute inset-y-1 w-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
      <VaneChevron
        size={6}
        className="relative"
        style={{ color: "var(--vanti-blue)", backgroundColor: "var(--vanti-ink)" }}
      />
    </div>
  );
}