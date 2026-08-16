import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/vanti/animated-number";
import { EmptyState } from "@/components/vanti/empty-state";
import { EquityChart } from "@/components/vanti/equity-chart";
import { PositionRow } from "@/components/vanti/position-row";
import { PositionRowSkeleton } from "@/components/vanti/skeletons";
import { PullToRefresh } from "@/components/vanti/pull-to-refresh";
import { TradeHistoryList } from "@/components/vanti/trade-history-list";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  formatBalance,
  formatContracts,
  formatDate,
  formatSignedBalance,
  formatSignedPercent,
} from "@/lib/format";
import {
  EQUITY_RANGES,
  sliceEquity,
  tradeHistoryQuery,
  type EquityRangeKey,
  type PortfolioPosition,
  type SettledPosition,
} from "@/lib/portfolio";
import { sellPosition, tradeErrorMessage } from "@/lib/trade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Vanti" },
      {
        name: "description",
        content:
          "Your Vanti account value, virtual balance, open positions and settled predictions.",
      },
      { property: "og:title", content: "Portfolio — Vanti" },
      {
        property: "og:description",
        content:
          "Your Vanti account value, virtual balance, open positions and settled predictions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

type PositionSort = "pnl" | "size" | "resolution";

function PortfolioPage() {
  const queryClient = useQueryClient();
  const { userId, positions, settled, summary, equity, today, hasEquityHistory, isPending } =
    usePortfolio();
  const { data: trades = [] } = useQuery(tradeHistoryQuery(userId));

  const [sort, setSort] = useState<PositionSort>("pnl");
  const [marketFilter, setMarketFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState("all");
  const [range, setRange] = useState<EquityRangeKey>("1W");
  

  const chartPoints = useMemo(() => sliceEquity(equity, range), [equity, range]);

  const sortedPositions = useMemo(() => {
    const list = [...positions];
    if (sort === "pnl") list.sort((a, b) => b.unrealized - a.unrealized);
    if (sort === "size") list.sort((a, b) => b.value - a.value);
    if (sort === "resolution")
      list.sort(
        (a, b) => new Date(a.resolutionDate).getTime() - new Date(b.resolutionDate).getTime(),
      );
    return list;
  }, [positions, sort]);

  const tradeMarkets = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trades) map.set(t.marketId, t.question);
    return [...map.entries()];
  }, [trades]);

  const filteredTrades = useMemo(
    () =>
      trades.filter(
        (t) =>
          (marketFilter === "all" || t.marketId === marketFilter) &&
          (sideFilter === "all" || t.side === sideFilter),
      ),
    [trades, marketFilter, sideFilter],
  );

  const sell = useMutation({
    mutationFn: (position: PortfolioPosition) =>
      sellPosition({
        marketId: position.marketId,
        side: position.side,
        contracts: position.contracts,
      }),
    onSuccess: (result) => {
      toast.success(`Sold for ${formatBalance(result.total)}`);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["portfolio-positions"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["trade-history"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
    onError: (error) => toast.error(tradeErrorMessage(error)),
  });


  const dayUp = today.change >= 0;

  const refresh = async () => {
    await Promise.all(
      [
        ["profile"],
        ["portfolio-positions"],
        ["pool-positions"],
        ["trade-history"],
        ["transactions"],
        ["resolved-results"],
        ["markets"],
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="@container space-y-8 pb-10">
      {/* Balance header: total account value is the hero figure. */}
      <header className="space-y-4">
        <h1 className="text-meta font-semibold uppercase text-muted-foreground">
          Total account value
        </h1>
        {isPending ? (
          <Skeleton className="h-12 w-56" />
        ) : (
          <AnimatedNumber
            className="num block text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
            value={summary.portfolioValue}
            format={formatBalance}
          />
        )}
        <p className={cn("num text-sm font-semibold", dayUp ? "text-positive" : "text-negative")}>
          {formatSignedBalance(today.change)} ({formatSignedPercent(today.pct)}) today
        </p>

        <dl className="grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <dt className="text-meta uppercase text-muted-foreground">Available</dt>
            <dd className="num mt-1 text-lg font-semibold text-foreground">
              {formatBalance(summary.balance)}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <dt className="text-meta uppercase text-muted-foreground">In positions</dt>
            <dd className="num mt-1 text-lg font-semibold text-foreground">
              {formatBalance(summary.positionsValue)}
            </dd>
          </div>
        </dl>

        <p className="text-meta text-muted-foreground">
          Virtual currency only. No deposits, no withdrawals, no real-money value.
        </p>
      </header>

      {/* Value chart, hidden until there is enough history to shape a line. */}
      {hasEquityHistory ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Portfolio value</h2>
            <div className="flex gap-1" role="group" aria-label="Chart range">
              {EQUITY_RANGES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  aria-pressed={range === option.key}
                  className={cn(
                    "num min-h-11 rounded-md px-3 text-meta font-semibold transition-colors duration-150",
                    range === option.key
                      ? "bg-accent-subtle text-accent-solid"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.key}
                </button>
              ))}
            </div>
          </div>
          <EquityChart points={chartPoints} />
        </section>
      ) : null}

      {/* Open positions, including each pool share the trader owns. */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Open positions</h2>
          <div className="flex items-center gap-3">
            <p className="num text-meta text-muted-foreground">
              {positions.length} open · {formatBalance(summary.positionsValue)} at market
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as PositionSort)}>
              <SelectTrigger className="h-11 w-44" aria-label="Sort positions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl">Unrealized P&L</SelectItem>
                <SelectItem value="size">Position size</SelectItem>
                <SelectItem value="resolution">Resolution date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isPending ? (
          <div className="@container divide-y divide-border rounded-lg border border-border bg-card">
            {Array.from({ length: 3 }, (_, i) => (
              <PositionRowSkeleton key={i} />
            ))}
          </div>
        ) : sortedPositions.length ? (
          <div className="@container divide-y divide-border rounded-lg border border-border bg-card">
            {sortedPositions.map((position) => (
              <PositionRow
                key={position.id}
                position={position}
                selling={sell.isPending && sell.variables?.id === position.id}
                onSell={(p) => sell.mutate(p)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open positions yet. Browse markets to place your first trade."
            action={
              <Button asChild size="sm">
                <Link to="/markets">Browse markets</Link>
              </Button>
            }
          />
        )}
      </section>

      <SettledSection settled={settled} />

      {/* Full ledger stays available, collapsed so the screen reads as one scroll. */}
      <Collapsible className="@container space-y-4">
        <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
          <span className="text-base font-semibold text-foreground">Trade activity</span>
          <span className="flex items-center gap-2">
            <span className="num text-meta text-muted-foreground">{trades.length} trades</span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="h-11 w-full max-w-xs" aria-label="Filter by market">
                <SelectValue placeholder="All markets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All markets</SelectItem>
                {tradeMarkets.map(([id, question]) => (
                  <SelectItem key={id} value={id}>
                    {question.length > 48 ? `${question.slice(0, 48)}…` : question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sideFilter} onValueChange={setSideFilter}>
              <SelectTrigger className="h-11 w-32" aria-label="Filter by side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both sides</SelectItem>
                <SelectItem value="yes">YES</SelectItem>
                <SelectItem value="no">NO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TradeHistoryList
            trades={filteredTrades}
            emptyCopy={
              trades.length
                ? "No trades match these filters."
                : "Your trade history will appear here."
            }
          />
        </CollapsibleContent>
      </Collapsible>

    </div>
  );
}

/** Resolved predictions with their realized outcome. Collapsed by default. */
function SettledSection({ settled }: { settled: SettledPosition[] }) {
  const realized = settled.reduce((sum, s) => sum + s.realized, 0);

  return (
    <Collapsible className="space-y-4">
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
        <span className="text-base font-semibold text-foreground">Settled positions</span>
        <span className="flex items-center gap-2">
          <span className="num text-meta text-muted-foreground">{settled.length}</span>
          {settled.length ? (
            <span
              className={cn(
                "num text-meta font-semibold",
                realized >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {formatSignedBalance(realized)}
            </span>
          ) : null}
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {settled.length ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {settled.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "num rounded px-1.5 py-0.5 text-meta font-semibold uppercase",
                        item.side === "yes"
                          ? "bg-positive-subtle text-positive"
                          : "bg-negative-subtle text-negative",
                      )}
                    >
                      {item.side}
                    </span>
                    <span className="num text-meta uppercase text-muted-foreground">
                      Resolved {item.outcome}
                    </span>
                    <span
                      className={cn(
                        "num grid size-4 place-items-center rounded text-[10px] font-semibold",
                        item.won
                          ? "bg-positive-subtle text-positive"
                          : "bg-negative-subtle text-negative",
                      )}
                      aria-label={item.won ? "Won" : "Lost"}
                    >
                      {item.won ? "W" : "L"}
                    </span>
                  </div>
                  <Link
                    to="/market/$marketId"
                    params={{ marketId: item.marketId }}
                    className="mt-1 line-clamp-2 block text-sm font-semibold leading-snug text-foreground hover:text-accent-solid"
                  >
                    {item.question}
                  </Link>
                  <p className="num mt-1 text-meta text-muted-foreground">
                    {formatContracts(item.contracts)} contracts · settled{" "}
                    {formatDate(item.settledAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "num text-sm font-semibold",
                      item.realized >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatSignedBalance(item.realized)}
                  </p>
                  <p
                    className={cn(
                      "num text-meta",
                      item.realized >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatSignedPercent(item.realizedPct)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing has settled yet. Resolved predictions land here." />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
