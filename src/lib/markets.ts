import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type MarketCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type PricePoint = { t: number; price: number };

export type Market = {
  id: string;
  question: string;
  description: string | null;
  yesPrice: number;
  noPrice: number;
  volume: number;
  traderCount: number;
  resolutionDate: string;
  resolutionSource: string | null;
  resolutionCriteria: string | null;
  status: string;
  outcome: string | null;
  createdAt: string;
  category: { name: string; slug: string; icon: string | null } | null;
  change24h: number;
  spark: PricePoint[];
};

function clampPrice(value: number) {
  return Math.min(0.99, Math.max(0.01, value));
}

/**
 * Single source of truth for 24h change: current YES price vs the YES price
 * recorded closest to (but not after) 24h ago. Used by every surface.
 */
export function computeChange24h(points: PricePoint[], currentPrice: number) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const older = points.filter((p) => p.t <= cutoff);
  const reference = older.length ? older[older.length - 1]!.price : (points[0]?.price ?? currentPrice);
  return currentPrice - reference;
}

/** 24h change and sparkline series derived from a market's recent price points. */
function deriveSeries(points: PricePoint[], currentPrice: number) {
  return {
    change24h: computeChange24h(points, currentPrice),
    spark: points.slice(-40),
  };
}

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 10 * 60 * 1000,
  queryFn: async (): Promise<MarketCategory[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const marketsQuery = queryOptions({
  queryKey: ["markets"],
  staleTime: 60 * 1000,
  queryFn: async (): Promise<Market[]> => {
    const [marketsRes, historyRes] = await Promise.all([
      supabase
        .from("markets")
        .select(
          "id, question, description, yes_price, volume, trader_count, resolution_date, resolution_source, resolution_criteria, status, outcome, created_at, categories(name, slug, icon)",
        )
        .order("volume", { ascending: false }),
      supabase
        .from("market_price_history")
        .select("market_id, yes_price, recorded_at")
        .gte("recorded_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("recorded_at", { ascending: true })
        .limit(50000),
    ]);
    if (marketsRes.error) throw marketsRes.error;
    if (historyRes.error) throw historyRes.error;

    const byMarket = new Map<string, PricePoint[]>();
    for (const row of historyRes.data ?? []) {
      const list = byMarket.get(row.market_id) ?? [];
      list.push({ t: new Date(row.recorded_at).getTime(), price: Number(row.yes_price) });
      byMarket.set(row.market_id, list);
    }

    return (marketsRes.data ?? []).map((row) => {
      const yesPrice = clampPrice(Number(row.yes_price));
      const points = byMarket.get(row.id) ?? [];
      const { change24h, spark } = deriveSeries(points, yesPrice);
      return {
        id: row.id,
        question: row.question,
        description: row.description,
        yesPrice,
        noPrice: 1 - yesPrice,
        volume: Number(row.volume),
        traderCount: row.trader_count,
        resolutionDate: row.resolution_date,
        resolutionSource: row.resolution_source,
        resolutionCriteria: row.resolution_criteria,
        status: row.status,
        outcome: row.outcome,
        createdAt: row.created_at,
        category: row.categories ?? null,
        change24h,
        spark,
      } satisfies Market;
    });
  },
});

export function marketQuery(marketId: string) {
  return queryOptions({
    queryKey: ["market", marketId],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Market> => {
      const [marketRes, historyRes] = await Promise.all([
        supabase
          .from("markets")
          .select(
            "id, question, description, yes_price, volume, trader_count, resolution_date, resolution_source, resolution_criteria, status, outcome, created_at, categories(name, slug, icon)",
          )
          .eq("id", marketId)
          .maybeSingle(),
        supabase
          .from("market_price_history")
          .select("yes_price, recorded_at")
          .eq("market_id", marketId)
          .order("recorded_at", { ascending: true }),
      ]);
      if (marketRes.error) throw marketRes.error;
      if (!marketRes.data) throw new Error("Market not found");
      if (historyRes.error) throw historyRes.error;

      const row = marketRes.data;
      const yesPrice = clampPrice(Number(row.yes_price));
      const points: PricePoint[] = (historyRes.data ?? []).map((p) => ({
        t: new Date(p.recorded_at).getTime(),
        price: Number(p.yes_price),
      }));
      const { change24h } = deriveSeries(points, yesPrice);
      return {
        id: row.id,
        question: row.question,
        description: row.description,
        yesPrice,
        noPrice: 1 - yesPrice,
        volume: Number(row.volume),
        traderCount: row.trader_count,
        resolutionDate: row.resolution_date,
        resolutionSource: row.resolution_source,
        resolutionCriteria: row.resolution_criteria,
        status: row.status,
        outcome: row.outcome,
        createdAt: row.created_at,
        category: row.categories ?? null,
        change24h,
        spark: points,
      } satisfies Market;
    },
  });
}

export type RecentTrade = {
  id: string;
  side: string;
  action: string;
  contracts: number;
  price: number;
  createdAt: string;
};

/**
 * Recent activity for a market, scoped to the signed-in user's own trades.
 * Other users' trade rows are private (RLS: trades_select_own).
 */
export function marketTradesQuery(marketId: string, userId: string | undefined) {
  return queryOptions({
    queryKey: ["market-trades", marketId, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RecentTrade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select("id, side, action, contracts, price, created_at")
        .eq("market_id", marketId)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        side: t.side,
        action: t.action,
        contracts: Number(t.contracts),
        price: Number(t.price),
        createdAt: t.created_at,
      }));
    },
  });
}

export function watchlistQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["watchlist", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("watchlist").select("market_id");
      if (error) throw error;
      return (data ?? []).map((row) => row.market_id);
    },
  });
}