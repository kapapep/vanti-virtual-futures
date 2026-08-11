import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type TradeSide = "yes" | "no";
export type TradeAction = "buy" | "sell";

export type Position = {
  id: string;
  marketId: string;
  side: TradeSide;
  contracts: number;
  avgPrice: number;
};

export type TradeResult = {
  balance: number;
  price: number;
  contracts: number;
  total: number;
  yesPrice: number;
  position: { side: TradeSide; contracts: number; avgPrice: number };
};

const TRADE_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Sign in to place a trade.",
  NOT_AUTHORIZED: "You don't have permission to do that.",
  INVALID_SIDE: "Pick either YES or NO.",
  INVALID_ACTION: "That trade action isn't supported.",
  INVALID_AMOUNT: "Enter an amount greater than $0.",
  INVALID_PRICE: "This market's price is unavailable right now.",
  INVALID_OUTCOME: "Choose a valid outcome.",
  MARKET_NOT_FOUND: "This market no longer exists.",
  MARKET_NOT_RESOLVABLE: "This market can't be resolved.",
  MARKET_CLOSED: "This market is closed to trading.",
  MARKET_EXPIRED: "This market has passed its resolution date.",
  PROFILE_NOT_FOUND: "We couldn't load your account.",
  INSUFFICIENT_BALANCE: "Insufficient balance for this trade.",
  NO_POSITION: "You don't hold any contracts on that side.",
  EXCEEDS_POSITION: "You can't sell more contracts than you hold.",
};

/** Turns a raw Postgres error into a readable, user-facing message. */
export function tradeErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  for (const [code, message] of Object.entries(TRADE_ERRORS)) {
    if (raw.includes(code)) return message;
  }
  return "That trade couldn't be completed. Please try again.";
}

/** Executes a trade through the single atomic database function. */
export async function executeTrade(input: {
  marketId: string;
  side: TradeSide;
  action: TradeAction;
  amount: number;
}): Promise<TradeResult> {
  const { data, error } = await supabase.rpc("execute_trade", {
    p_market_id: input.marketId,
    p_side: input.side,
    p_action: input.action,
    p_amount: input.amount,
  });
  if (error) throw new Error(tradeErrorMessage(error));

  const raw = data as {
    balance: number | string;
    price: number | string;
    contracts: number | string;
    total: number | string;
    yes_price: number | string;
    position: { side: TradeSide; contracts: number | string; avg_price: number | string };
  };
  return {
    balance: Number(raw.balance),
    price: Number(raw.price),
    contracts: Number(raw.contracts),
    total: Number(raw.total),
    yesPrice: Number(raw.yes_price),
    position: {
      side: raw.position.side,
      contracts: Number(raw.position.contracts),
      avgPrice: Number(raw.position.avg_price),
    },
  };
}

export function marketPositionsQuery(marketId: string, userId: string | undefined) {
  return queryOptions({
    queryKey: ["positions", marketId, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Position[]> => {
      const { data, error } = await supabase
        .from("positions")
        .select("id, market_id, side, contracts, avg_price")
        .eq("market_id", marketId)
        .eq("user_id", userId!)
        .gt("contracts", 0);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        marketId: row.market_id,
        side: row.side as TradeSide,
        contracts: Number(row.contracts),
        avgPrice: Number(row.avg_price),
      }));
    },
  });
}
