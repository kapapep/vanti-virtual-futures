import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Countdown } from "@/components/vanti/countdown";
import { PoolProgress } from "@/components/vanti/pool-progress";
import { formatBalance, formatCount, formatRelativeTime } from "@/lib/format";
import { fundedRatio, poolResult, type Pool } from "@/lib/pools";
import { cn } from "@/lib/utils";

export type PoolEvent = "started" | "funded" | "settled";

/** Headline copy for each kind of pool feed event. */
export function poolEventOf(pool: Pool): PoolEvent {
  if (pool.status === "settled" || pool.status === "cancelled") return "settled";
  if (fundedRatio(pool) >= 1) return "funded";
  return "started";
}

export function PoolFeedCard({
  pool,
  event,
}: {
  pool: Pool;
  event: PoolEvent;
}) {
  const result = poolResult(pool);
  const captain = pool.captain?.username ?? "A trader";
  const headline =
    event === "settled"
      ? result === "win"
        ? "Pool paid out"
        : result === "loss"
          ? "Pool came up short"
          : "Pool refunded at cost"
      : event === "funded"
        ? "Pool hit its target"
        : "New pool opened";

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-meta uppercase text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full bg-accent-subtle">
          <Users className="size-3 text-accent-solid" />
        </span>
        <span
          className={cn(
            "font-medium",
            event === "settled" && result === "win" && "text-positive",
            event === "settled" && result === "loss" && "text-negative",
            event !== "settled" && "text-accent-solid",
          )}
        >
          {headline}
        </span>
        <span className="num ml-auto">{formatRelativeTime(pool.createdAt)}</span>
      </div>

      <Link
        to="/pool/$poolId"
        params={{ poolId: pool.id }}
        className="mt-2 block space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="text-sm font-extrabold text-foreground">{pool.name}</p>
        <p className="text-meta text-muted-foreground">
          @{captain} backing{" "}
          <span
            className={cn(
              "font-medium uppercase",
              pool.outcomeSide === "yes" ? "text-positive" : "text-negative",
            )}
          >
            {pool.outcomeSide}
          </span>
          {pool.market ? ` · ${pool.market.question}` : ""}
        </p>
        <PoolProgress
          raised={pool.totalContributed}
          target={pool.targetStake}
          height={4}
        />
        <p className="num text-meta text-muted-foreground">
          {formatCount(pool.memberCount)} members ·{" "}
          {pool.status === "open" ? (
            <>
              locks in <Countdown to={pool.lockAt} />
            </>
          ) : (
            `${formatBalance(pool.totalContributed)} pooled`
          )}
        </p>
      </Link>
    </article>
  );
}