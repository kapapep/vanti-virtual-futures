import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/vanti/countdown";
import { PoolChat } from "@/components/vanti/pool-chat";
import { PoolProgress } from "@/components/vanti/pool-progress";
import { SideBadge, PoolStatusPill } from "@/components/vanti/pool-status-pill";
import { useProfile, useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import {
  formatBalance,
  formatCents,
  formatContracts,
  formatPercent,
  formatSignedBalance,
  formatSignedPercent,
} from "@/lib/format";
import {
  joinPool,
  sharesFor,
  sidePrice,
  poolLedgerQuery,
  poolMembersQuery,
  poolPnl,
  poolQuery,
  poolResult,
} from "@/lib/pools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/syndicate/$syndicateId")({
  head: () => ({
    meta: [
      { title: "Pool — Vanti" },
      {
        name: "description",
        content:
          "Pool virtual currency with other Vanti traders, track shares owned and split winnings by shares.",
      },
      { property: "og:title", content: "Pool — Vanti" },
      {
        property: "og:description",
        content:
          "Pool virtual currency with other Vanti traders, track shares owned and split winnings by shares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PoolDetailPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Pool not found.</p>,
});

const QUICK_AMOUNTS = [25, 50, 100];

function PoolDetailPage() {
  const { poolId } = Route.useParams();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const pool = useQuery(poolQuery(poolId));
  const members = useQuery(poolMembersQuery(poolId));
  const ledger = useQuery(poolLedgerQuery(poolId));
  const [amount, setAmount] = useState("");

  // Realtime: the progress bar and member list must move as people join.
  useEffect(() => {
    const channel = supabase
      .channel(`pool-${poolId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "syndicates", filter: `id=eq.${poolId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["pool", poolId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "syndicate_members",
          filter: `syndicate_id=eq.${poolId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["pool", poolId] });
          void queryClient.invalidateQueries({ queryKey: ["pool-members", poolId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [poolId, queryClient]);

  const join = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than V0.");
      return joinPool({ poolId, amount: value });
    },
    onSuccess: (result) => {
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["pool", poolId] });
      void queryClient.invalidateQueries({ queryKey: ["pool-members", poolId] });
      void queryClient.invalidateQueries({ queryKey: ["pool-ledger", poolId] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        `Bought ${formatContracts(result.sharesBought)} shares at ${formatCents(result.priceAtEntry)}.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (pool.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (!pool.data) return <p className="text-sm text-muted-foreground">Pool not found.</p>;

  const s = pool.data;
  const list = members.data ?? [];
  const viewerMember = list.find((m) => m.userId === user?.id);
  const yesPrice = s.market?.yesPrice ?? 0.5;
  const price = sidePrice(yesPrice, s.outcomeSide);
  const pnl = poolPnl(s, yesPrice);
  const result = poolResult(s);
  const open = s.status === "open" && new Date(s.lockAt).getTime() > Date.now();
  const parsed = Number(amount);
  const previewShares = sharesFor(Number.isFinite(parsed) ? parsed : 0, price);
  const balance = profile?.balance ?? 0;
  const viewerPayout = viewerMember ? viewerMember.sharesOwned * 1 : 0;
  const viewerLedger = (ledger.data ?? []).filter(
    (entry) => entry.userId === user?.id && entry.entryType !== "contribution",
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PoolStatusPill pool={s} />
          <SideBadge side={s.outcomeSide} />
          {s.visibility === "invite_only" ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-meta font-medium uppercase text-secondary-foreground">
              Invite only
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{s.name}</h1>
        {s.market ? (
          <Link
            to="/market/$marketId"
            params={{ marketId: s.market.id }}
            className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {s.market.question}
          </Link>
        ) : null}
        {s.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">Funding</h2>
              <span className="num text-meta text-muted-foreground">
                {s.status === "open" ? (
                  <>
                    Locks in <Countdown to={s.lockAt} />
                  </>
                ) : (
                  `Locked ${formatPercent(1)} · ${list.length} members`
                )}
              </span>
            </div>
            <PoolProgress raised={s.totalContributed} target={s.targetStake} height={8} />
            <dl className="grid grid-cols-2 gap-3 pt-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-meta uppercase text-muted-foreground">Members</dt>
                <dd className="num font-semibold text-foreground">
                  {list.length}/{s.maxMembers}
                </dd>
              </div>
              <div>
                <dt className="text-meta uppercase text-muted-foreground">Pool shares</dt>
                <dd className="num font-semibold text-foreground">
                  {formatContracts(s.totalShares)}
                </dd>
              </div>
              <div>
                <dt className="text-meta uppercase text-muted-foreground">Side price</dt>
                <dd className="num font-semibold text-foreground">{formatCents(price)}</dd>
              </div>
              <div>
                <dt className="text-meta uppercase text-muted-foreground">Min contribution</dt>
                <dd className="num font-semibold text-foreground">
                  {formatBalance(s.minContribution)}
                </dd>
              </div>
            </dl>
          </section>

          {s.status === "settled" || s.status === "cancelled" ? (
            <section className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-extrabold text-foreground">Final result</h2>
              <p
                className={cn(
                  "text-lg font-extrabold",
                  result === "win" ? "text-positive" : result === "loss" ? "text-negative" : "text-foreground",
                )}
              >
                {result === "win"
                  ? `Resolved ${s.outcomeSide.toUpperCase()} — every share paid ${formatBalance(1)}`
                  : result === "loss"
                    ? "Resolved against this pool — shares expired worthless"
                    : "Voided — every member refunded at cost"}
              </p>
              {viewerLedger.length ? (
                <ul className="divide-y divide-border">
                  {viewerLedger.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="capitalize text-muted-foreground">{entry.entryType}</span>
                      <span
                        className={cn(
                          "num font-semibold",
                          entry.amount > 0 ? "text-positive" : entry.amount < 0 ? "text-negative" : "text-foreground",
                        )}
                      >
                        {formatSignedBalance(entry.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : (
            <section className="space-y-2 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-extrabold text-foreground">Live pool P&amp;L</h2>
              <p
                className={cn(
                  "num text-2xl font-extrabold tracking-tight",
                  pnl.pnl >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {formatSignedBalance(pnl.pnl)}{" "}
                <span className="text-sm font-semibold">{formatSignedPercent(pnl.ratio)}</span>
              </p>
              <p className="num text-meta text-muted-foreground">
                {formatContracts(s.totalShares)} shares × {formatCents(pnl.price)} ={" "}
                {formatBalance(pnl.value)} vs {formatBalance(s.totalContributed)} contributed
              </p>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-extrabold text-foreground">Members</h2>
              <span className="num text-meta text-muted-foreground">
                shares decide the split
              </span>
            </div>
            {members.isPending ? (
              <Skeleton className="mt-3 h-20 w-full rounded-lg" />
            ) : list.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nobody has contributed yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {list.map((member) => {
                  const share = s.totalShares > 0 ? member.sharesOwned / s.totalShares : 0;
                  const initial = (member.profile?.displayName ?? member.profile?.username ?? "?")
                    .slice(0, 1)
                    .toUpperCase();
                  return (
                    <li key={member.id} className="flex items-center gap-3 py-2.5">
                      <Avatar className="size-8 shrink-0">
                        {member.profile?.avatarUrl ? (
                          <AvatarImage src={member.profile.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-meta">{initial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          @{member.profile?.username ?? "unknown"}
                          {member.userId === s.captainId ? (
                            <span className="ml-2 text-meta uppercase text-accent-solid">Captain</span>
                          ) : null}
                        </p>
                        <p className="num text-meta text-muted-foreground">
                          {formatBalance(member.contributed)} · {formatContracts(member.sharesOwned)}{" "}
                          shares
                        </p>
                      </div>
                      <span className="num text-sm font-semibold text-foreground">
                        {formatPercent(share)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <PoolChat poolId={poolId} canPost={Boolean(viewerMember) || s.captainId === user?.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-extrabold text-foreground">
              {open ? "Contribute" : "Contributions closed"}
            </h2>

            {open ? (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={s.minContribution}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(s.minContribution)}
                  aria-label="Contribution amount"
                  className="num h-12 text-lg"
                />
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      className="num min-h-11"
                      onClick={() => setAmount(String(value))}
                    >
                      {formatBalance(value).replace(".00", "")}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setAmount(String(Math.floor(balance)))}
                  >
                    Max
                  </Button>
                </div>

                <p className="num text-sm text-foreground">
                  {previewShares > 0
                    ? `${formatBalance(parsed)} buys ${formatContracts(previewShares)} shares at ${formatCents(price)}`
                    : `Shares are bought at the live price, currently ${formatCents(price)}`}
                </p>
                <p className="num text-meta text-muted-foreground">
                  If this resolves {s.outcomeSide.toUpperCase()} you receive{" "}
                  {formatBalance((viewerMember?.sharesOwned ?? 0) + previewShares)}
                </p>

                <Button
                  className="min-h-12 w-full text-base font-extrabold"
                  onClick={() => join.mutate()}
                  disabled={join.isPending}
                >
                  {join.isPending ? "Contributing…" : "Contribute"}
                </Button>
                <p className="text-meta text-muted-foreground">
                  Virtual currency only. Contributions can't be withdrawn — no early exit.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {s.status === "open"
                  ? "This pool has passed its lock time."
                  : "This pool is no longer accepting contributions."}
              </p>
            )}
          </section>

          {viewerMember ? (
            <section className="space-y-2 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-extrabold text-foreground">Your stake</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Contributed</dt>
                  <dd className="num font-semibold text-foreground">
                    {formatBalance(viewerMember.contributed)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Shares owned</dt>
                  <dd className="num font-semibold text-foreground">
                    {formatContracts(viewerMember.sharesOwned)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Payout if {s.outcomeSide.toUpperCase()}</dt>
                  <dd className="num font-semibold text-positive">{formatBalance(viewerPayout)}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}