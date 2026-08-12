import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Countdown } from "@/components/vanti/countdown";
import { SyndicateProgress } from "@/components/vanti/syndicate-progress";
import { SideBadge, SyndicateStatusPill } from "@/components/vanti/syndicate-status-pill";
import { formatCount } from "@/lib/format";
import type { Syndicate } from "@/lib/syndicates";

/** Compact syndicate row used on market detail and in the feed. */
export function SyndicateCard({ syndicate }: { syndicate: Syndicate }) {
  const captain = syndicate.captain;
  const initial = (captain?.displayName ?? captain?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <Link
      to="/syndicate/$syndicateId"
      params={{ syndicateId: syndicate.id }}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-9 shrink-0">
          {captain?.avatarUrl ? <AvatarImage src={captain.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-meta">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-extrabold text-foreground">{syndicate.name}</span>
            <SyndicateStatusPill syndicate={syndicate} />
            <SideBadge side={syndicate.outcomeSide} />
          </div>
          <p className="text-meta text-muted-foreground">
            Captained by @{captain?.username ?? "unknown"}
          </p>
          <SyndicateProgress raised={syndicate.totalContributed} target={syndicate.targetStake} height={4} />
          <div className="flex items-center justify-between gap-2 text-meta text-muted-foreground">
            <span className="num inline-flex items-center gap-1">
              <Users className="size-3" />
              {formatCount(syndicate.memberCount)}/{formatCount(syndicate.maxMembers)}
            </span>
            <span className="num">
              {syndicate.status === "open" ? (
                <>
                  Locks in <Countdown to={syndicate.lockAt} />
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}