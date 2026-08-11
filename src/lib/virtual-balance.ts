import { supabase } from "@/integrations/supabase/client";
import { formatBalance } from "@/lib/format";

const BALANCE_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Sign in to manage your virtual balance.",
  PROFILE_NOT_FOUND: "We couldn't load your account.",
};

/**
 * Resets the signed-in trader's virtual balance to 10,000 and clears their
 * positions, trade history and activity. Virtual currency only.
 */
export async function resetVirtualBalance(): Promise<{ balance: number }> {
  const { data, error } = await supabase.rpc("reset_virtual_balance");
  if (error) throw error;
  const result = data as { balance: number };
  return { balance: Number(result.balance) };
}

export function balanceErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  for (const [code, copy] of Object.entries(BALANCE_ERRORS)) {
    if (message.includes(code)) return copy;
  }
  return "Something went wrong resetting your virtual balance.";
}

/** Human label for an activity entry type. */
export function transactionLabel(type: string): string {
  switch (type) {
    case "signup_grant":
      return "Starting balance";
    case "virtual_topup":
      return "Balance reset";
    case "virtual_withdrawal":
      return "Balance adjustment";
    case "trade_buy":
      return "Bought contracts";
    case "trade_sell":
      return "Sold contracts";
    case "settlement":
      return "Market winnings";
    default:
      return type.replace(/_/g, " ");
  }
}

/** Starting virtual balance for every Vanti account. */
export const STARTING_BALANCE = 10000;
export const STARTING_BALANCE_LABEL = formatBalance(STARTING_BALANCE);
