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
import { addVirtualCash, cashErrorMessage, transactionLabel } from "@/lib/cash";
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

function BalancePage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useProfile();
  const { data: transactions = [] } = useQuery(transactionsQuery(user?.id));
  const [amount, setAmount] = useState("500");

  const deposit = useMutation({
    mutationFn: (value: number) => addVirtualCash(value),
    onSuccess: (result) => {
      toast.success(`Added ${formatBalance(result.amount)} of virtual cash.`);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => toast.error(cashErrorMessage(error)),
  });

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 10000;
  const ledger = [...transactions].reverse();

  return (
    <div className="@container space-y-8">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Balance</h1>
        <p className="text-sm text-muted-foreground">
          Virtual cash only — Vanti never handles real money.
        </p>
      </div>

      <section className="space-y-6 rounded-lg border border-border bg-card p-5 @md:p-6">
        <div>
          <p className="text-meta font-medium uppercase text-muted-foreground">Available cash</p>
          {isPending ? (
            <Skeleton className="mt-2 h-9 w-40" />
          ) : (
            <AnimatedNumber
              className="num mt-1 block text-display font-semibold text-foreground"
              value={profile?.balance ?? 0}
              format={formatBalance}
            />
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <Label htmlFor="cash-amount" className="text-meta font-medium uppercase text-muted-foreground">
            Add virtual cash
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
          </div>
          <div className="flex flex-col gap-2 @sm:flex-row">
            <Input
              id="cash-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="num h-11 @sm:max-w-40"
              aria-label="Amount of virtual cash to add"
            />
            <Button
              className="h-11 @sm:w-44"
              disabled={!valid || deposit.isPending}
              onClick={() => deposit.mutate(parsed)}
            >
              {deposit.isPending ? "Depositing…" : "Deposit virtual cash"}
            </Button>
          </div>
          <p className="text-meta text-muted-foreground">
            Up to {formatBalance(10000)} of practice cash per day. No payment method needed, ever.
          </p>
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
