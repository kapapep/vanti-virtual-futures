import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/vanti/animated-number";
import { EmptyState } from "@/components/vanti/empty-state";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import {
  addVirtualCash,
  cashErrorMessage,
  transactionLabel,
  withdrawVirtualCash,
} from "@/lib/cash";
import { formatBalance, formatDateTime, formatSignedBalance } from "@/lib/format";
import { transactionsQuery } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Balance — Vanti" },
      {
        name: "description",
        content: "Your Vanti virtual cash balance, top-ups and full account ledger.",
      },
      { property: "og:title", content: "Balance — Vanti" },
      {
        property: "og:description",
        content: "Your Vanti virtual cash balance, top-ups and full account ledger.",
      },
    ],
  }),
  component: BalancePage,
});

const QUICK_AMOUNTS = [100, 500, 1000, 5000] as const;

type CashMode = "add" | "withdraw";

/** Pill button whose label is the action itself. */
function PillAction({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors",
        active
          ? "border-accent-solid bg-accent-solid text-accent-solid-foreground"
          : "border-border bg-surface text-foreground hover:border-accent-solid hover:text-accent-solid",
      )}
    >
      {label}
    </button>
  );
}

function BalancePage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useProfile();
  const { data: transactions = [] } = useQuery(transactionsQuery(user?.id));
  const [amount, setAmount] = useState("500");
  const [mode, setMode] = useState<CashMode | null>(null);

  const cash = useMutation({
    mutationFn: ({ value, kind }: { value: number; kind: CashMode }) =>
      kind === "add" ? addVirtualCash(value) : withdrawVirtualCash(value),
    onSuccess: (result, variables) => {
      toast.success(
        variables.kind === "add"
          ? `Added ${formatBalance(result.amount)} of virtual cash.`
          : `Withdrew ${formatBalance(result.amount)} of virtual cash.`,
      );
      setMode(null);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => toast.error(cashErrorMessage(error)),
  });

  const parsed = Number(amount);
  const available = profile?.balance ?? 0;
  const valid =
    Number.isFinite(parsed) &&
    parsed >= 1 &&
    parsed <= 10000 &&
    (mode === "withdraw" ? parsed <= available : true);
  const ledger = [...transactions].reverse();

  return (
    <div className="@container space-y-8">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Balance</h1>
        <p className="text-sm text-muted-foreground">
          Virtual cash only — Vanti never handles real money.
        </p>
      </div>

      <section className="space-y-5 rounded-lg border border-border bg-card p-5 @md:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-meta font-medium uppercase text-muted-foreground">
              Available cash
            </p>
            {isPending ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <AnimatedNumber
                className="num mt-1 block text-xl text-foreground"
                value={profile?.balance ?? 0}
                format={formatBalance}
              />
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <PillAction
              label="Add cash"
              active={mode === "add"}
              onClick={() => setMode(mode === "add" ? null : "add")}
            />
            <PillAction
              label="Withdraw"
              active={mode === "withdraw"}
              onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
            />
          </div>
        </div>

        <div className="space-y-5">
          {mode ? (
            <div className="space-y-3">
              <Label
                htmlFor="cash-amount"
                className="text-meta font-medium uppercase text-muted-foreground"
              >
                {mode === "add" ? "Add virtual cash" : "Withdraw virtual cash"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={cn(
                      "num inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-semibold transition-colors",
                      Number(amount) === value
                        ? "border-accent-solid bg-accent-subtle text-accent-solid"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {formatBalance(value)}
                  </button>
                ))}
                {mode === "withdraw" ? (
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.floor(available * 100) / 100))}
                    className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Max
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 @sm:flex-row">
                <Input
                  id="cash-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="num h-11 @sm:max-w-40"
                  aria-label={
                    mode === "add"
                      ? "Amount of virtual cash to add"
                      : "Amount of virtual cash to withdraw"
                  }
                />
                <Button
                  className="h-11 @sm:w-44"
                  disabled={!valid || cash.isPending}
                  onClick={() => cash.mutate({ value: parsed, kind: mode })}
                >
                  {cash.isPending
                    ? mode === "add"
                      ? "Adding…"
                      : "Withdrawing…"
                    : mode === "add"
                      ? "Add virtual cash"
                      : "Withdraw virtual cash"}
                </Button>
              </div>
              <p className="text-meta text-muted-foreground">
                {mode === "add"
                  ? `Up to ${formatBalance(10000)} of practice cash per day. No payment method needed, ever.`
                  : `Withdrawals move practice cash out of your available balance. Max ${formatBalance(available)}.`}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Cash activity</h2>
        {ledger.length ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {transactionLabel(entry.type)}
                  </p>
                  <p className="num text-meta text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "num text-sm font-semibold",
                      entry.amount >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatSignedBalance(entry.amount)}
                  </p>
                  <p className="num text-meta text-muted-foreground">
                    {formatBalance(entry.balanceAfter)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Your cash activity will appear here." />
        )}
      </section>
    </div>
  );
}
