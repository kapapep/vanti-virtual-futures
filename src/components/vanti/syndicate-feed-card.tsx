import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { Countdown } from "@/components/vanti/countdown";
import { SyndicateProgress } from "@/components/vanti/syndicate-progress";
import { formatBalance, formatCount, formatRelativeTime } from "@/lib/format";
import { fundedRatio, syndicateResult, type Syndicate } from "@/lib/syndicates";
import { cn } from "@/lib/utils";

export type SyndicateEvent = "started" | "funded" | "settled";

/** Headline copy for each kind of syndicate feed event. */
export function syndicateEventOf(syndicate: Syndicate): SyndicateEvent {
  if (syndicate.status === "settled" || syndicate.status === "cancelled") return "settled";
  if (fundedRatio(syndicate) >= 1) return "funded";
  return "started";
}

export function SyndicateFeedCard({
  syndicate,
  event,
}: {
  syndicate: Syndicate;
  event: SyndicateEvent;
}) {
  const result = syndicateResult(syndicate);
  const captain = syndicate.captain?.username ?? "A trader";
  const headline =
    event === "settled"
      ? result === "win"
        ? "Syndicate paid out"
        : result === "loss"
          ? "Syndicate came up short"
          : "Syndicate refunded at cost"
      : event === "funded"
        ? "Syndicate hit its target"
        : "New syndicate opened";

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
        <span className="num ml-auto">{formatRelativeTime(syndicate.createdAt)}</span>
      </div>

      <Link
        to="/syndicate/$syndicateId"
        params={{ syndicateId: syndicate.id }}
        className="mt-2 block space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="text-sm font-extrabold text-foreground">{syndicate.name}</p>
        <p className="text-meta text-muted-foreground">
          @{captain} backing{" "}
          <span
            className={cn(
              "font-medium uppercase",
              syndicate.outcomeSide === "yes" ? "text-positive" : "text-negative",
            )}
          >
            {syndicate.outcomeSide}
          </span>
          {syndicate.market ? ` · ${syndicate.market.question}` : ""}
        </p>
        <SyndicateProgress
          raised={syndicate.totalContributed}
          target={syndicate.targetStake}
          height={4}
        />
        <p className="num text-meta text-muted-foreground">
          {formatCount(syndicate.memberCount)} members ·{" "}
          {syndicate.status === "open" ? (
            <>
              locks in <Countdown to={syndicate.lockAt} />
            </>
          ) : (
            `${formatBalance(syndicate.totalContributed)} pooled`
          )}
        </p>
      </Link>
    </article>
  );
}