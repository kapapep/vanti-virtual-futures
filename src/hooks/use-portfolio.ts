import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useProfile, useSession } from "@/hooks/use-vanti-session";
import {
  buildEquityCurve,
  buildSettledPositions,
  buildSummary,
  positionsQuery,
  resolvedResultsQuery,
  poolPositionsQuery,
  todayChange,
  tradeHistoryQuery,
  transactionsQuery,
  type EquityPoint,
  type PortfolioPosition,
  type PortfolioSummary,
  type SettledPosition,
} from "@/lib/portfolio";

export type PortfolioData = {
  userId: string | undefined;
  /** Direct positions plus each pool share, sorted by unrealized P&L. */
  positions: PortfolioPosition[];
  settled: SettledPosition[];
  summary: PortfolioSummary;
  equity: EquityPoint[];
  today: { change: number; pct: number };
  /** True once there is enough history to draw a meaningful value chart. */
  hasEquityHistory: boolean;
  isPending: boolean;
};

/**
 * Single source of truth for the signed-in trader's balance, positions and
 * performance. The balance header, value chart and position lists all read it,
 * so the numbers can never disagree.
 */
export function usePortfolio(): PortfolioData {
  const { user } = useSession();
  const userId = user?.id;

  const profile = useProfile();
  const direct = useQuery(positionsQuery(userId));
  const pooled = useQuery(poolPositionsQuery(userId));
  const trades = useQuery(tradeHistoryQuery(userId));
  const transactions = useQuery(transactionsQuery(userId));
  const resolved = useQuery(resolvedResultsQuery(userId));

  const positions = useMemo(
    () =>
      [...(direct.data ?? []), ...(pooled.data ?? [])].sort(
        (a, b) => b.unrealized - a.unrealized,
      ),
    [direct.data, pooled.data],
  );

  const summary = useMemo(
    () =>
      buildSummary({
        balance: profile.data?.balance ?? 0,
        positions,
        transactions: transactions.data ?? [],
        resolved: resolved.data ?? { wins: 0, total: 0 },
      }),
    [profile.data?.balance, positions, transactions.data, resolved.data],
  );

  const equity = useMemo(
    () =>
      buildEquityCurve({
        transactions: transactions.data ?? [],
        trades: trades.data ?? [],
        portfolioValue: summary.portfolioValue,
      }),
    [transactions.data, trades.data, summary.portfolioValue],
  );

  const settled = useMemo(() => buildSettledPositions(trades.data ?? []), [trades.data]);
  const today = useMemo(() => todayChange(equity, summary.portfolioValue), [equity, summary]);

  // Two points is a straight line between the signup grant and now; wait for a
  // real shape before showing a chart at all.
  const distinctValues = new Set(equity.map((p) => Math.round(p.value * 100))).size;
  const hasEquityHistory = equity.length >= 3 && distinctValues >= 2;

  return {
    userId,
    positions,
    settled,
    summary,
    equity,
    today,
    hasEquityHistory,
    isPending:
      profile.isPending || direct.isPending || pooled.isPending || transactions.isPending,
  };
}