import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { TradeSide } from "@/lib/trade";

export const STARTING_BALANCE = 10000;

export type PortfolioPosition = {
  id: string;
  marketId: string;
  side: TradeSide;
  contracts: number;
  avgPrice: number;
  currentPrice: number;
  question: string;
  status: string;
  outcome: string | null;
  resolutionDate: string;
  yesPrice: number;
  categoryName: string | null;
  /** contracts * (currentPrice - avgPrice) */
  unrealized: number;
  unrealizedPct: number;
  costBasis: number;
  value: number;
  /** Set when this row is a member's share of a pool's pooled position. */
  pool: { id: string; name: string } | null;
};

export type PortfolioTrade = {
  id: string;
  marketId: string;
  question: string;
  side: TradeSide;
  action: "buy" | "sell";
  contracts: number;
  price: number;
  total: number;
  createdAt: string;
  /** Market status at read time, used to badge a settled prediction W or L. */
  marketStatus: string;
  marketOutcome: string | null;
  marketResolutionDate: string | null;
};

export type PortfolioTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

/**
 * Open positions a user holds directly, joined with their market's live price.
 * Pooled pool rows are excluded here: they are owned by the captain and
 * surfaced per member by `poolPositionsQuery` at each member's own share.
 */
export function positionsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["portfolio-positions", userId],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PortfolioPosition[]> => {
      const { data, error } = await supabase
        .from("positions")
        .select(
          "id, market_id, side, contracts, avg_price, markets(question, yes_price, status, outcome, resolution_date, categories(name))",
        )
        .eq("user_id", userId!)
        .is("syndicate_id", null)
        .gt("contracts", 0);
      if (error) throw error;

      return (data ?? [])
        .filter((row) => row.markets)
        .map((row) => {
          const market = row.markets!;
          const side = row.side as TradeSide;
          const yesPrice = Number(market.yes_price);
          const currentPrice = side === "yes" ? yesPrice : 1 - yesPrice;
          const contracts = Number(row.contracts);
          const avgPrice = Number(row.avg_price);
          const unrealized = contracts * (currentPrice - avgPrice);
          const costBasis = contracts * avgPrice;
          return {
            id: row.id,
            marketId: row.market_id,
            side,
            contracts,
            avgPrice,
            currentPrice,
            question: market.question,
            status: market.status,
            outcome: market.outcome,
            resolutionDate: market.resolution_date,
            yesPrice,
            categoryName: market.categories?.name ?? null,
            unrealized,
            unrealizedPct: costBasis > 0 ? unrealized / costBasis : 0,
            costBasis,
            value: contracts * currentPrice,
            pool: null,
          } satisfies PortfolioPosition;
        });
    },
  });
}

/**
 * A member's own slice of every pool they are in that holds a live position.
 * Shares and cost come from their contribution, never the pool total.
 */
export function poolPositionsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["pool-positions", userId],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PortfolioPosition[]> => {
      const { data, error } = await supabase
        .from("syndicate_members")
        .select(
          "id, contributed, shares_owned, syndicates!syndicate_members_syndicate_id_fkey(id, name, outcome_side, status, market_id, markets!pools_market_id_fkey(question, yes_price, status, outcome, resolution_date, categories(name)))",
        )
        .eq("user_id", userId!)
        .gt("shares_owned", 0);
      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .filter((row) => row.syndicates?.status === "locked" && row.syndicates?.markets)
        .map((row) => {
          const pool = row.syndicates;
          const market = pool.markets;
          const side = pool.outcome_side as TradeSide;
          const yesPrice = Number(market.yes_price);
          const currentPrice = side === "yes" ? yesPrice : 1 - yesPrice;
          const contracts = Number(row.shares_owned);
          const costBasis = Number(row.contributed);
          const avgPrice = contracts > 0 ? costBasis / contracts : 0;
          const unrealized = contracts * currentPrice - costBasis;
          return {
            id: `pool:${row.id}`,
            marketId: pool.market_id,
            side,
            contracts,
            avgPrice,
            currentPrice,
            question: market.question,
            status: market.status,
            outcome: market.outcome,
            resolutionDate: market.resolution_date,
            yesPrice,
            categoryName: market.categories?.name ?? null,
            unrealized,
            unrealizedPct: costBasis > 0 ? unrealized / costBasis : 0,
            costBasis,
            value: contracts * currentPrice,
            pool: { id: pool.id, name: pool.name },
          } satisfies PortfolioPosition;
        });
    },
  });
}

/** Full trade history for a user, newest first. */
export function tradeHistoryQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["trade-history", userId],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PortfolioTrade[]> => {
      const { data, error } = await supabase
        .from("trades")
        .select(
          "id, market_id, side, action, contracts, price, total, created_at, markets(question, status, outcome, resolution_date)",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        marketId: row.market_id,
        question: row.markets?.question ?? "Market",
        side: row.side as TradeSide,
        action: row.action as "buy" | "sell",
        contracts: Number(row.contracts),
        price: Number(row.price),
        total: Number(row.total),
        createdAt: row.created_at,
        marketStatus: row.markets?.status ?? "active",
        marketOutcome: row.markets?.outcome ?? null,
        marketResolutionDate: row.markets?.resolution_date ?? null,
      }));
    },
  });
}

/** Cash-flow ledger for the signed-in user (own rows only). */
export function transactionsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["transactions", userId],
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<PortfolioTransaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, balance_after, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        balanceAfter: Number(row.balance_after),
        createdAt: row.created_at,
      }));
    },
  });
}

/** Resolved markets a user traded, used for win rate. */
export function resolvedResultsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["resolved-results", userId],
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ wins: number; total: number }> => {
      const { data, error } = await supabase
        .from("trades")
        .select("market_id, side, action, markets(status, outcome)")
        .eq("user_id", userId!)
        .eq("action", "buy")
        .limit(1000);
      if (error) throw error;
      const seen = new Map<string, boolean>();
      for (const row of data ?? []) {
        const market = row.markets;
        if (!market || market.status !== "resolved" || !market.outcome) continue;
        seen.set(`${row.market_id}:${row.side}`, row.side === market.outcome);
      }
      let wins = 0;
      for (const won of seen.values()) if (won) wins += 1;
      return { wins, total: seen.size };
    },
  });
}

export type PortfolioSummary = {
  balance: number;
  invested: number;
  positionsValue: number;
  portfolioValue: number;
  unrealized: number;
  realized: number;
  totalPnl: number;
  totalPnlPct: number;
  winRate: number | null;
  wins: number;
  resolvedCount: number;
};

/**
 * Portfolio maths. Realized P&L is the trading cash flow (sells + settlements −
 * buys) plus the cost still tied up in open positions.
 */
export function buildSummary(input: {
  balance: number;
  positions: PortfolioPosition[];
  transactions: PortfolioTransaction[];
  resolved: { wins: number; total: number };
}): PortfolioSummary {
  const invested = input.positions.reduce((sum, p) => sum + p.costBasis, 0);
  const positionsValue = input.positions.reduce((sum, p) => sum + p.value, 0);
  const unrealized = input.positions.reduce((sum, p) => sum + p.unrealized, 0);
  const cashFlow = input.transactions
    .filter((t) => t.type === "trade_buy" || t.type === "trade_sell" || t.type === "settlement")
    .reduce((sum, t) => sum + t.amount, 0);
  const realized = cashFlow + invested;
  const portfolioValue = input.balance + positionsValue;
  // All-time return measured against the $10,000 virtual grant, so the number
  // matches what a trader sees on their public profile.
  const totalPnl = portfolioValue - STARTING_BALANCE;

  return {
    balance: input.balance,
    invested,
    positionsValue,
    portfolioValue,
    unrealized,
    realized,
    totalPnl,
    totalPnlPct: STARTING_BALANCE > 0 ? totalPnl / STARTING_BALANCE : 0,
    winRate: input.resolved.total > 0 ? input.resolved.wins / input.resolved.total : null,
    wins: input.resolved.wins,
    resolvedCount: input.resolved.total,
  };
}

export type EquityPoint = { t: number; value: number };

export type SettledPosition = {
  id: string;
  marketId: string;
  question: string;
  side: TradeSide;
  outcome: string;
  won: boolean;
  contracts: number;
  costBasis: number;
  payout: number;
  realized: number;
  realizedPct: number;
  settledAt: string;
};

/**
 * Closed-out predictions, rebuilt from trades on markets that have resolved.
 * Realized P&L is the $1.00-per-contract settlement on the winning side minus
 * what the trader paid, net of anything they sold before resolution.
 */
export function buildSettledPositions(trades: PortfolioTrade[]): SettledPosition[] {
  const groups = new Map<string, PortfolioTrade[]>();
  for (const trade of trades) {
    if (trade.marketStatus !== "resolved" || !trade.marketOutcome) continue;
    const key = `${trade.marketId}:${trade.side}`;
    const list = groups.get(key) ?? [];
    list.push(trade);
    groups.set(key, list);
  }

  const settled: SettledPosition[] = [];
  for (const [key, list] of groups) {
    const first = list[0]!;
    let contracts = 0;
    let cost = 0;
    for (const trade of list) {
      if (trade.action === "buy") {
        contracts += trade.contracts;
        cost += trade.total;
      } else {
        contracts -= trade.contracts;
        cost -= trade.total;
      }
    }
    const held = Math.max(0, contracts);
    const won = first.side === first.marketOutcome;
    const payout = won ? held : 0;
    const realized = payout - cost;
    const basis = Math.max(cost, 0);
    const settledAt =
      first.marketResolutionDate ??
      list.reduce((latest, t) => (t.createdAt > latest ? t.createdAt : latest), first.createdAt);
    settled.push({
      id: key,
      marketId: first.marketId,
      question: first.question,
      side: first.side,
      outcome: first.marketOutcome!,
      won,
      contracts: held,
      costBasis: cost,
      payout,
      realized,
      realizedPct: basis > 0 ? realized / basis : 0,
      settledAt,
    });
  }

  return settled.sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime());
}

/** Change in portfolio value over the last 24 hours, from the equity curve. */
export function todayChange(points: EquityPoint[], portfolioValue: number) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const before = points.filter((p) => p.t <= cutoff);
  const reference = before.length ? before[before.length - 1]!.value : (points[0]?.value ?? portfolioValue);
  const change = portfolioValue - reference;
  return { change, pct: reference > 0 ? change / reference : 0 };
}

/**
 * Equity curve: cash balance after each ledger entry plus the cost basis of the
 * positions held at that moment, with the final point marked to market.
 */
export function buildEquityCurve(input: {
  transactions: PortfolioTransaction[];
  trades: PortfolioTrade[];
  portfolioValue: number;
}): EquityPoint[] {
  const trades = [...input.trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const book = new Map<string, { contracts: number; avg: number }>();
  let cost = 0;
  let tradeIndex = 0;
  const points: EquityPoint[] = [];

  for (const tx of input.transactions) {
    const at = new Date(tx.createdAt).getTime();
    while (tradeIndex < trades.length && new Date(trades[tradeIndex]!.createdAt).getTime() <= at) {
      const trade = trades[tradeIndex]!;
      const key = `${trade.marketId}:${trade.side}`;
      const held = book.get(key) ?? { contracts: 0, avg: 0 };
      if (trade.action === "buy") {
        const contracts = held.contracts + trade.contracts;
        held.avg = contracts > 0 ? (held.contracts * held.avg + trade.total) / contracts : 0;
        held.contracts = contracts;
        cost += trade.total;
      } else {
        cost -= trade.contracts * held.avg;
        held.contracts = Math.max(0, held.contracts - trade.contracts);
      }
      book.set(key, held);
      tradeIndex += 1;
    }
    points.push({ t: at, value: tx.balanceAfter + Math.max(0, cost) });
  }

  const now = Date.now();
  if (!points.length) return [{ t: now, value: input.portfolioValue }];
  points.push({ t: now, value: input.portfolioValue });
  return points;
}

export const EQUITY_RANGES = [
  { key: "1D", hours: 24 },
  { key: "1W", hours: 24 * 7 },
  { key: "1M", hours: 24 * 30 },
  { key: "ALL", hours: null },
] as const;

export type EquityRangeKey = (typeof EQUITY_RANGES)[number]["key"];

export function sliceEquity(points: EquityPoint[], range: EquityRangeKey): EquityPoint[] {
  const config = EQUITY_RANGES.find((r) => r.key === range);
  if (!config?.hours) return points;
  const cutoff = Date.now() - config.hours * 60 * 60 * 1000;
  const inRange = points.filter((p) => p.t >= cutoff);
  if (inRange.length >= 2) return inRange;
  return points.slice(-2);
}
