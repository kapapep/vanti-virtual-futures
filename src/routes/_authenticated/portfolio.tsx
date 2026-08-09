import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/vanti/empty-state";
import { PositionRowSkeleton } from "@/components/vanti/skeletons";
import { PositionRow } from "@/components/vanti/position-row";
import { TradeHistoryList } from "@/components/vanti/trade-history-list";
import { useSession } from "@/hooks/use-vanti-session";
import { formatBalance } from "@/lib/format";
import {
  positionsQuery,
  tradeHistoryQuery,
  type PortfolioPosition,
} from "@/lib/portfolio";
import { executeTrade, tradeErrorMessage } from "@/lib/trade";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Vanti" },
      {
        name: "description",
        content: "Your open Vanti positions and full virtual trade history.",
      },
      { property: "og:title", content: "Portfolio — Vanti" },
      {
        property: "og:description",
        content: "Your open Vanti positions and full virtual trade history.",
      },
    ],
  }),
  component: PortfolioPage,
});

type PositionSort = "pnl" | "size" | "resolution";

function PortfolioPage() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: positions = [], isPending: positionsPending } = useQuery(positionsQuery(userId));
  const { data: trades = [] } = useQuery(tradeHistoryQuery(userId));

  const [sort, setSort] = useState<PositionSort>("pnl");
  const [marketFilter, setMarketFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState("all");

  const positionsValue = useMemo(
    () => positions.reduce((sum, p) => sum + p.value, 0),
    [positions],
  );

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
      executeTrade({
        marketId: position.marketId,
        side: position.side,
        action: "sell",
        amount: Math.max(0.01, position.contracts * position.currentPrice),
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

  return (
    <div className="@container space-y-8">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Your open positions and every virtual trade you have made.
        </p>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Open positions</TabsTrigger>
          <TabsTrigger value="history">Trade history</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="num text-meta text-muted-foreground">
              {positions.length} open · {formatBalance(positionsValue)} at market
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as PositionSort)}>
              <SelectTrigger className="h-9 w-44" aria-label="Sort positions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl">Unrealized P&L</SelectItem>
                <SelectItem value="size">Position size</SelectItem>
                <SelectItem value="resolution">Resolution date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {positionsPending ? (
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
        </TabsContent>

        <TabsContent value="history" className="@container space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="h-9 w-full max-w-xs" aria-label="Filter by market">
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
              <SelectTrigger className="h-9 w-32" aria-label="Filter by side">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  hint?: string;
}) {
  return (
    <div>
      <p className="text-meta font-medium uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-lg font-semibold",
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-meta text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
