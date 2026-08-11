import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/vanti/animated-number";
import { EmptyState } from "@/components/vanti/empty-state";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { formatBalance, formatDateTime, formatSignedBalance } from "@/lib/format";
import { transactionsQuery } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import {
  balanceErrorMessage,
  resetVirtualBalance,
  STARTING_BALANCE_LABEL,
  transactionLabel,
} from "@/lib/virtual-balance";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Balance — Vanti" },
      {
        name: "description",
        content: "Your Vanti virtual balance and full trade activity. Virtual currency only.",
      },
      { property: "og:title", content: "Balance — Vanti" },
      {
        property: "og:description",
        content: "Your Vanti virtual balance and full trade activity. Virtual currency only.",
      },
    ],
  }),
  component: BalancePage,
});

/** Pill button whose label is the action itself. */
function PillAction({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors disabled:opacity-60",
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
  const [confirming, setConfirming] = useState(false);

  const reset = useMutation({
    mutationFn: resetVirtualBalance,
    onSuccess: () => {
      toast.success(`Reset your virtual balance to ${STARTING_BALANCE_LABEL}.`);
      setConfirming(false);
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(balanceErrorMessage(error)),
  });

  const ledger = [...transactions].reverse();

  return (
    <div className="@container space-y-8">
      <h1 className="text-figure font-semibold text-foreground">Balance</h1>

      <section className="space-y-5">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-meta font-medium uppercase text-muted-foreground">
              Virtual balance
            </p>
            {isPending ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <AnimatedNumber
                className="num mt-1 block text-2xl text-foreground"
                value={profile?.balance ?? 0}
                format={formatBalance}
              />
            )}
            <p className="mt-2 max-w-md text-meta text-muted-foreground">
              Virtual currency only. No deposits, no withdrawals, no real-money value.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PillAction
              label={reset.isPending ? "Resetting…" : "Reset balance"}
              active={false}
              disabled={reset.isPending}
              onClick={() => setConfirming(true)}
            />
          </div>
        </div>
      </section>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your virtual balance?</AlertDialogTitle>
            <AlertDialogDescription>
              Reset your virtual balance to {STARTING_BALANCE_LABEL}? This clears your positions and
              trade history. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                reset.mutate();
              }}
              disabled={reset.isPending}
            >
              {reset.isPending ? "Resetting…" : "Reset balance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Trade activity</h2>
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
          <EmptyState title="Your trade activity will appear here." />
        )}
      </section>
    </div>
  );
}
