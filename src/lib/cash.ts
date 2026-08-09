import { supabase } from "@/integrations/supabase/client";

const CASH_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "Sign in to add virtual cash.",
  INVALID_AMOUNT: "Enter an amount between $1 and $10,000.",
  DAILY_LIMIT_REACHED: "You've added the $10,000 daily maximum of virtual cash.",
  PROFILE_NOT_FOUND: "We couldn't load your account.",
};

/** Credits virtual practice cash to the signed-in trader. No real money involved. */
export async function addVirtualCash(amount: number): Promise<{ balance: number; amount: number }> {
  const { data, error } = await supabase.rpc("add_virtual_cash", { p_amount: amount });
  if (error) throw error;
  const result = data as { balance: number; amount: number };
  return { balance: Number(result.balance), amount: Number(result.amount) };
}

export function cashErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  for (const [code, copy] of Object.entries(CASH_ERRORS)) {
    if (message.includes(code)) return copy;
  }
  return "Something went wrong adding virtual cash.";
}

/** Human label for a ledger entry type. */
export function transactionLabel(type: string): string {
  switch (type) {
    case "signup_grant":
      return "Signup grant";
    case "virtual_topup":
      return "Added virtual cash";
    case "trade_buy":
      return "Bought contracts";
    case "trade_sell":
      return "Sold contracts";
    case "settlement":
      return "Market settlement";
    default:
      return type.replace(/_/g, " ");
  }
}
