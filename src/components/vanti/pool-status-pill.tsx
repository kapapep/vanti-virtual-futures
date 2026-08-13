import type { Pool } from "@/lib/pools";
import { poolResult } from "@/lib/pools";
import { cn } from "@/lib/utils";

const LABEL: Record<Pool["status"], string> = {
  open: "Funding",
  locked: "Locked",
  settled: "Settled",
  cancelled: "Refunded",
};

/** Status chip for a pool, including the settled outcome. */
export function PoolStatusPill({ pool }: { pool: Pool }) {
  const result = poolResult(pool);
  const settledWin = pool.status === "settled" && result === "win";
  const settledLoss = pool.status === "settled" && result === "loss";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-meta font-medium uppercase",
        pool.status === "open" && "bg-accent-subtle text-accent-solid",
        settledWin && "bg-positive/15 text-positive",
        settledLoss && "bg-negative/15 text-negative",
        (pool.status === "locked" || pool.status === "cancelled") &&
          "bg-secondary text-secondary-foreground",
        pool.status === "settled" && result === "void" && "bg-secondary text-secondary-foreground",
      )}
    >
      {settledWin ? "Settled · Won" : settledLoss ? "Settled · Lost" : LABEL[pool.status]}
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