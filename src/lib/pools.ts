import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PoolSide = "yes" | "no";
export type PoolStatus = "open" | "locked" | "settled" | "cancelled";
export type PoolVisibility = "public" | "invite_only";

export type PoolCaptain = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Pool = {
  id: string;
  marketId: string;
  captainId: string;
  name: string;
  description: string | null;
  outcomeSide: PoolSide;
  targetStake: number;
  minContribution: number;
  maxMembers: number;
  captainFeeBps: number;
  lockAt: string;
  visibility: PoolVisibility;
  status: PoolStatus;
  totalContributed: number;
  totalShares: number;
  positionId: string | null;
  settledAt: string | null;
  createdAt: string;
  memberCount: number;
  captain: PoolCaptain | null;
  market: { id: string; question: string; yesPrice: number; status: string; outcome: string | null } | null;
};

export type PoolMember = {
  id: string;
  userId: string;
  contributed: number;
  sharesOwned: number;
  joinedAt: string;
  profile: PoolCaptain | null;
};

export type PoolLedgerEntry = {
  id: string;
  userId: string | null;
  entryType: "contribution" | "payout" | "refund" | "fee";
  amount: number;
  createdAt: string;
  metadata: Record<string, unknown>;
};

const POOL_SELECT =
  "id, market_id, captain_id, name, description, outcome_side, target_stake, min_contribution, max_members, captain_fee_bps, lock_at, visibility, status, total_contributed, total_shares, position_id, settled_at, created_at, profiles!syndicates_captain_id_fkey(id, username, display_name, avatar_url), markets!syndicates_market_id_fkey(id, question, yes_price, status, outcome), syndicate_members(count)";

// Supabase's generated relational types don't narrow nested selects here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function mapPool(row: Row): Pool {
  const captain = row.profiles;
  const market = row.markets;
  return {
    id: row.id,
    marketId: row.market_id,
    captainId: row.captain_id,
    name: row.name,
    description: row.description,
    outcomeSide: row.outcome_side,
    targetStake: Number(row.target_stake),
    minContribution: Number(row.min_contribution),
    maxMembers: row.max_members,
    captainFeeBps: row.captain_fee_bps,
    lockAt: row.lock_at,
    visibility: row.visibility,
    status: row.status,
    totalContributed: Number(row.total_contributed),
    totalShares: Number(row.total_shares),
    positionId: row.position_id,
    settledAt: row.settled_at,
    createdAt: row.created_at,
    memberCount: Number(row.syndicate_members?.[0]?.count ?? 0),
    captain: captain
      ? {
          id: captain.id,
          username: captain.username,
          displayName: captain.display_name,
          avatarUrl: captain.avatar_url,
        }
      : null,
    market: market
      ? {
          id: market.id,
          question: market.question,
          yesPrice: Number(market.yes_price),
          status: market.status,
          outcome: market.outcome,
        }
      : null,
  };
}

/** Pools attached to one market, funding pools first. */
export function marketPoolsQuery(marketId: string) {
  return queryOptions({
    queryKey: ["market-pools", marketId],
    queryFn: async (): Promise<Pool[]> => {
      const { data, error } = await supabase
        .from("syndicates")
        .select(POOL_SELECT)
        .eq("market_id", marketId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPool);
    },
  });
}

export function poolQuery(poolId: string) {
  return queryOptions({
    queryKey: ["pool", poolId],
    queryFn: async (): Promise<Pool | null> => {
      const { data, error } = await supabase
        .from("syndicates")
        .select(POOL_SELECT)
        .eq("id", poolId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapPool(data) : null;
    },
  });
}

export function poolMembersQuery(poolId: string) {
  return queryOptions({
    queryKey: ["pool-members", poolId],
    queryFn: async (): Promise<PoolMember[]> => {
      const { data, error } = await supabase
        .from("syndicate_members")
        .select(
          "id, user_id, contributed, shares_owned, joined_at, profiles!syndicate_members_user_id_fkey(id, username, display_name, avatar_url)",
        )
        .eq("syndicate_id", poolId)
        .order("shares_owned", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Row) => ({
        id: row.id,
        userId: row.user_id,
        contributed: Number(row.contributed),
        sharesOwned: Number(row.shares_owned),
        joinedAt: row.joined_at,
        profile: row.profiles
          ? {
              id: row.profiles.id,
              username: row.profiles.username,
              displayName: row.profiles.display_name,
              avatarUrl: row.profiles.avatar_url,
            }
          : null,
      }));
    },
  });
}

/** Append-only settlement history for a pool. */
export function poolLedgerQuery(poolId: string) {
  return queryOptions({
    queryKey: ["pool-ledger", poolId],
    queryFn: async (): Promise<PoolLedgerEntry[]> => {
      const { data, error } = await supabase
        .from("syndicate_ledger")
        .select("id, user_id, entry_type, amount, created_at, metadata")
        .eq("syndicate_id", poolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Row) => ({
        id: row.id,
        userId: row.user_id,
        entryType: row.entry_type,
        amount: Number(row.amount),
        createdAt: row.created_at,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
      }));
    },
  });
}

/** Recent public pool activity for the feed. */
export const poolActivityQuery = queryOptions({
  queryKey: ["pool-activity"],
  staleTime: 60 * 1000,
  queryFn: async (): Promise<Pool[]> => {
    const { data, error } = await supabase
      .from("syndicates")
      .select(POOL_SELECT)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return (data ?? []).map(mapPool);
  },
});

/** Public pools for the Pools discovery tab. */
export const browsePoolsQuery = queryOptions({
  queryKey: ["browse-pools"],
  staleTime: 30 * 1000,
  queryFn: async (): Promise<Pool[]> => {
    const { data, error } = await supabase
      .from("syndicates")
      .select(POOL_SELECT)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []).map(mapPool);
  },
});

const POOL_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Sign in to join a pool.",
  SYNDICATE_NOT_FOUND: "This pool no longer exists.",
  SYNDICATE_CLOSED: "This pool is no longer taking contributions.",
  SYNDICATE_LOCKED: "This pool locked. Joining is closed.",
  SYNDICATE_FULL: "This pool is full.",
  BELOW_MIN_CONTRIBUTION: "That's below the minimum contribution.",
  INSUFFICIENT_BALANCE: "Your virtual balance doesn't cover that contribution.",
  INVALID_AMOUNT: "Enter an amount greater than V0.",
  INVALID_PRICE: "This market's price is unavailable right now.",
  MARKET_NOT_FOUND: "This market no longer exists.",
  MARKET_CLOSED: "This market is closed, so the pool can't take contributions.",
  MARKET_EXPIRED: "This market has passed its resolution date.",
  PROFILE_NOT_FOUND: "We couldn't load your account.",
  SERVER_MANAGED_COLUMN: "That field is managed by Vanti and can't be edited.",
};

export function poolErrorMessage(error: unknown): string {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  for (const [code, message] of Object.entries(POOL_ERRORS)) {
    if (raw.includes(code)) return message;
  }
  return "That pool action couldn't be completed. Please try again.";
}

export type JoinResult = {
  balance: number;
  priceAtEntry: number;
  sharesBought: number;
  totalContributed: number;
  totalShares: number;
};

/** Contributes virtual currency to a pool through the single atomic RPC. */
export async function joinPool(input: {
  poolId: string;
  amount: number;
}): Promise<JoinResult> {
  const { data, error } = await supabase.rpc("join_syndicate", {
    p_syndicate_id: input.poolId,
    p_amount: input.amount,
  });
  if (error) throw new Error(poolErrorMessage(error));
  const result = data as Row;
  return {
    balance: Number(result.balance),
    priceAtEntry: Number(result.price_at_entry),
    sharesBought: Number(result.shares_bought),
    totalContributed: Number(result.total_contributed),
    totalShares: Number(result.total_shares),
  };
}

export async function createPool(input: {
  marketId: string;
  captainId: string;
  name: string;
  description: string | null;
  outcomeSide: PoolSide;
  targetStake: number;
  minContribution: number;
  maxMembers: number;
  captainFeeBps: number;
  lockAt: string;
  visibility: PoolVisibility;
}): Promise<string> {
  const name = input.name.trim();
  if (name.length < 3) throw new Error("Give your pool a name of at least 3 characters.");
  if (input.targetStake <= 0) throw new Error("Set a target stake above V0.");
  if (input.minContribution <= 0) throw new Error("Set a minimum contribution above V0.");
  if (new Date(input.lockAt).getTime() <= Date.now()) {
    throw new Error("Pick a lock time in the future.");
  }
  const { data, error } = await supabase
    .from("syndicates")
    .insert({
      market_id: input.marketId,
      captain_id: input.captainId,
      name,
      description: input.description,
      outcome_side: input.outcomeSide,
      target_stake: input.targetStake,
      min_contribution: input.minContribution,
      max_members: input.maxMembers,
      captain_fee_bps: input.captainFeeBps,
      lock_at: input.lockAt,
      visibility: input.visibility,
    })
    .select("id")
    .single();
  if (error) throw new Error(poolErrorMessage(error));
  return data.id;
}

/** Captains may only delete a pool that nobody has contributed to. */
export async function deletePool(pool: Pool): Promise<void> {
  if (pool.totalContributed > 0) {
    throw new Error("This pool has contributions, so it can't be deleted.");
  }
  const { error } = await supabase.from("syndicates").delete().eq("id", pool.id);
  if (error) throw new Error(poolErrorMessage(error));
}

/** Price of the side a pool backs, from the market's single YES price. */
export function sidePrice(yesPrice: number, side: PoolSide): number {
  const price = side === "yes" ? yesPrice : 1 - yesPrice;
  return Math.min(0.99, Math.max(0.01, price));
}

/** Shares a contribution buys at the current price: amount / price. */
export function sharesFor(amount: number, price: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || price <= 0) return 0;
  return amount / price;
}

export function fundedRatio(pool: Pool): number {
  if (pool.targetStake <= 0) return 0;
  return Math.min(1, pool.totalContributed / pool.targetStake);
}

/** Live mark-to-market value of the pool's shares against what it cost. */
export function poolPnl(pool: Pool, yesPrice: number) {
  const price = sidePrice(yesPrice, pool.outcomeSide);
  const value = pool.totalShares * price;
  const pnl = value - pool.totalContributed;
  const ratio = pool.totalContributed > 0 ? pnl / pool.totalContributed : 0;
  return { price, value, pnl, ratio };
}

export function poolResult(pool: Pool): "win" | "loss" | "void" | null {
  if (pool.status === "cancelled") return "void";
  if (pool.status !== "settled") return null;
  const outcome = pool.market?.outcome;
  if (!outcome) return "void";
  return outcome === pool.outcomeSide ? "win" : "loss";
}