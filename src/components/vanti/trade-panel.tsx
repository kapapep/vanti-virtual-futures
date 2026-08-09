import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { formatBalance, formatCents } from "@/lib/format";
import type { Market } from "@/lib/markets";
import {
  executeTrade,
  marketPositionsQuery,
  tradeErrorMessage,
  type TradeResult,
  type TradeSide,
} from "@/lib/trade";
import { cn } from "@/lib/utils";

const QUICK_FILL = [10, 50, 100];

function Row({ label, value, className }: { label: string; value: string; className?: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-medium text-foreground", className)}>{value}</span>
    </div>
  );
}

export function TradePanel({ market, compact = false }: { market: Market; compact?: boolean }) {
  const { user } = useSession();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const positions = useQuery(marketPositionsQuery(market.id, user?.id));

  const [side, setSide] = useState<TradeSide>("yes");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<(TradeResult & { side: TradeSide; action: string }) | null>(
    null,
  );

  const balance = profile.data?.balance ?? 0;
  const price = side === "yes" ? market.yesPrice : market.noPrice;
  const parsed = Number(amount);
  const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const contracts = value > 0 && price > 0 ? value / price : 0;
  const payout = contracts;
  const profit = payout - value;

  const held = useMemo(
    () => (positions.data ?? []).find((p) => p.side === side),
    [positions.data, side],
  );
  const openPositions = positions.data ?? [];

  const closed = market.status !== "active";
  const expired = new Date(market.resolutionDate).getTime() <= Date.now();

  const blocked = closed
    ? market.status === "resolved"
      ? `Resolved ${market.outcome?.toUpperCase() ?? ""} — trading is closed.`
      : "This market is closed to trading."
    : expired
      ? "This market has passed its resolution date."
      : value <= 0
        ? "Enter an amount to trade."
        : value > balance
          ? "Amount exceeds your available balance."
          : null;

  useEffect(() => {
    if (!receipt) return;
    const timer = setTimeout(() => setReceipt(null), 6000);
    return () => clearTimeout(timer);
  }, [receipt]);

  const trade = useMutation({
    mutationFn: (action: "buy" | "sell") =>
      executeTrade({ marketId: market.id, side, action, amount: value }),
    onSuccess: (result, action) => {
      setReceipt({ ...result, side, action });
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["market", market.id] });
      void queryClient.invalidateQueries({ queryKey: ["market-trades", market.id] });
      void queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
    onError: (error) => toast.error(tradeErrorMessage(error)),
  });

  const sellAll = useMutation({
    mutationFn: (sellSide: TradeSide) => {
      const pos = openPositions.find((p) => p.side === sellSide);
      const sellPrice = sellSide === "yes" ? market.yesPrice : market.noPrice;
      return executeTrade({
        marketId: market.id,
        side: sellSide,
        action: "sell",
        amount: (pos?.contracts ?? 0) * sellPrice,
      });
    },
    onSuccess: (result, sellSide) => {
      setReceipt({ ...result, side: sellSide, action: "sell" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["market", market.id] });
      void queryClient.invalidateQueries({ queryKey: ["market-trades", market.id] });
      void queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
    onError: (error) => toast.error(tradeErrorMessage(error)),
  });

  const busy = trade.isPending || sellAll.isPending;

  return (
    <div className="space-y-3">
      {openPositions.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-meta font-semibold uppercase text-muted-foreground">Your position</h3>
          <ul className="mt-2 space-y-2">
            {openPositions.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span
                    className={cn(
                      "font-semibold uppercase",
                      p.side === "yes" ? "text-positive" : "text-negative",
                    )}
                  >
                    {p.side}
                  </span>{" "}
                  <span className="num text-muted-foreground">
                    {p.contracts.toFixed(2)} @ {formatCents(p.avgPrice)}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || closed || expired}
                  onClick={() => sellAll.mutate(p.side)}
                >
                  Sell
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={cn("rounded-lg border border-border bg-card p-4", compact && "p-3")}>
        <div className="grid grid-cols-2 gap-2">
          {(["yes", "no"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold uppercase transition-colors duration-150",
                side === s
                  ? s === "yes"
                    ? "border-positive bg-positive-subtle text-positive"
                    : "border-negative bg-negative-subtle text-negative"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={side === s}
            >
              {s} <span className="num">{formatCents(s === "yes" ? market.yesPrice : market.noPrice)}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <label htmlFor="trade-amount" className="text-meta font-medium text-muted-foreground">
            Amount (virtual $)
          </label>
          <Input
            id="trade-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="num"
          />
          <div className="grid grid-cols-4 gap-2">
            {QUICK_FILL.map((q) => (
              <Button key={q} variant="outline" size="sm" onClick={() => setAmount(String(q))}>
                ${q}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAmount(balance.toFixed(2))}>
              Max
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <Row label="Price" value={formatBalance(price)} />
          <Row label="Contracts" value={contracts.toFixed(2)} />
          <Row label="Potential payout" value={formatBalance(payout)} />
          <Row
            label="Potential profit"
            value={`${profit >= 0 ? "+" : "−"}${formatBalance(Math.abs(profit))}`}
            className={profit > 0 ? "text-positive" : profit < 0 ? "text-negative" : undefined}
          />
        </div>

        <Button
          className={cn(
            "mt-3 w-full font-semibold",
            side === "yes"
              ? "bg-positive text-positive-foreground hover:bg-positive/90"
              : "bg-negative text-negative-foreground hover:bg-negative/90",
          )}
          disabled={Boolean(blocked) || busy}
          onClick={() => trade.mutate("buy")}
        >
          {busy ? "Placing…" : side === "yes" ? "Buy YES" : "Buy NO"}
        </Button>

        {blocked ? (
          <p role="status" className="mt-2 text-meta text-muted-foreground">
            {blocked}
          </p>
        ) : null}
        <p className="mt-2 text-meta text-muted-foreground">
          Balance <span className="num">{formatBalance(balance)}</span> · virtual money only
        </p>

        {receipt ? (
          <div className="mt-3 animate-in fade-in slide-in-from-bottom-1 duration-300 rounded-md border border-border bg-secondary p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Check className="size-4 text-positive" />
              {receipt.action === "buy" ? "Bought" : "Sold"} {receipt.side.toUpperCase()}
            </p>
            <div className="mt-2 space-y-1">
              <Row label="Contracts" value={receipt.contracts.toFixed(2)} />
              <Row label="Price" value={formatBalance(receipt.price)} />
              <Row label="Total" value={formatBalance(receipt.total)} />
              <Row label="Potential payout" value={formatBalance(receipt.contracts)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
