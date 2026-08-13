import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Countdown } from "@/components/vanti/countdown";
import { PoolProgress } from "@/components/vanti/pool-progress";
import { SideBadge, PoolStatusPill } from "@/components/vanti/pool-status-pill";
import { formatBalance, formatCount, formatPercent } from "@/lib/format";
import { poolPnl, type Pool } from "@/lib/pools";
import { cn } from "@/lib/utils";

/** Compact pool row used on market detail and in the feed. */
export function PoolCard({
  pool,
  urgent = false,
  showPnl = false,
}: {
  pool: Pool;
  /** Highlight the lock countdown when the pool closes very soon. */
  urgent?: boolean;
  /** Show live P&L instead of the funding progress bar. */
  showPnl?: boolean;
}) {
  const captain = pool.captain;
  const initial = (captain?.displayName ?? captain?.username ?? "?").slice(0, 1).toUpperCase();
  const pnl = showPnl && pool.market ? poolPnl(pool, pool.market.yesPrice) : null;

  return (
    <Link
      to="/pools/$poolId"
      params={{ poolId: pool.id }}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          {captain?.avatarUrl ? <AvatarImage src={captain.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-meta">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-extrabold text-foreground">{pool.name}</span>
            <PoolStatusPill pool={pool} />
            <SideBadge side={pool.outcomeSide} />
          </div>
          <p className="text-meta text-muted-foreground">
            Captained by @{captain?.username ?? "unknown"}
          </p>
          {pnl ? (
            <div className="flex items-baseline justify-between gap-2 text-meta">
              <span className="num font-medium text-foreground">
                {formatBalance(pnl.value)}{" "}
                <span className="font-normal text-muted-foreground">position value</span>
              </span>
              <span
                className={cn("num font-medium", pnl.pnl < 0 ? "text-negative" : "text-positive")}
              >
                {pnl.pnl >= 0 ? "+" : "−"}
                {formatBalance(Math.abs(pnl.pnl))} ({formatPercent(Math.abs(pnl.ratio))})
              </span>
            </div>
          ) : (
            <PoolProgress raised={pool.totalContributed} target={pool.targetStake} height={4} />
          )}
          <div className="flex items-center justify-between gap-2 text-meta text-muted-foreground">
            <span className="num inline-flex items-center gap-1">
              <Users className="size-3" />
              {formatCount(pool.memberCount)}/{formatCount(pool.maxMembers)}
            </span>
            {pool.status === "open" ? (
              <span
                className={cn(
                  "num",
                  urgent && "font-extrabold text-urgent",
                )}
              >
                Locks in <Countdown to={pool.lockAt} />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}