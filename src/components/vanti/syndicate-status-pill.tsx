import type { Syndicate } from "@/lib/syndicates";
import { syndicateResult } from "@/lib/syndicates";
import { cn } from "@/lib/utils";

const LABEL: Record<Syndicate["status"], string> = {
  open: "Funding",
  locked: "Locked",
  settled: "Settled",
  cancelled: "Refunded",
};

/** Status chip for a syndicate, including the settled outcome. */
export function SyndicateStatusPill({ syndicate }: { syndicate: Syndicate }) {
  const result = syndicateResult(syndicate);
  const settledWin = syndicate.status === "settled" && result === "win";
  const settledLoss = syndicate.status === "settled" && result === "loss";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-meta font-medium uppercase",
        syndicate.status === "open" && "bg-accent-subtle text-accent-solid",
        settledWin && "bg-positive/15 text-positive",
        settledLoss && "bg-negative/15 text-negative",
        (syndicate.status === "locked" || syndicate.status === "cancelled") &&
          "bg-secondary text-secondary-foreground",
        syndicate.status === "settled" && result === "void" && "bg-secondary text-secondary-foreground",
      )}
    >
      {settledWin ? "Settled · Won" : settledLoss ? "Settled · Lost" : LABEL[syndicate.status]}
    </span>
  );
}

export function SideBadge({ side }: { side: "yes" | "no" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-meta font-medium uppercase",
        side === "yes" ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative",
      )}
    >
      Backing {side}
    </span>
  );
}