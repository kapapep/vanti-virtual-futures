import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Countdown } from "@/components/vanti/countdown";
import { PoolProgress } from "@/components/vanti/pool-progress";
import { SideBadge, PoolStatusPill } from "@/components/vanti/pool-status-pill";
import { formatCount } from "@/lib/format";
import type { Pool } from "@/lib/pools";

/** Compact pool row used on market detail and in the feed. */
export function PoolCard({ pool }: { pool: Pool }) {
  const captain = pool.captain;
  const initial = (captain?.displayName ?? captain?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <Link
      to="/pool/$poolId"
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
          <PoolProgress raised={pool.totalContributed} target={pool.targetStake} height={4} />
          <div className="flex items-center justify-between gap-2 text-meta text-muted-foreground">
            <span className="num inline-flex items-center gap-1">
              <Users className="size-3" />
              {formatCount(pool.memberCount)}/{formatCount(pool.maxMembers)}
            </span>
            <span className="num">
              {pool.status === "open" ? (
                <>
                  Locks in <Countdown to={pool.lockAt} />
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}