import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PoolCard } from "@/components/vanti/pool-card";
import { browsePoolsQuery, type Pool } from "@/lib/pools";

export const Route = createFileRoute("/_authenticated/pools/")({
  head: () => ({
    meta: [
      { title: "Pools — Vanti" },
      {
        name: "description",
        content: "Browse open virtual-currency pools and pool into a shared market position.",
      },
      { property: "og:title", content: "Pools — Vanti" },
      {
        property: "og:description",
        content: "Browse open virtual-currency pools and pool into a shared market position.",
      },
    ],
  }),
  component: PoolsPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
});

function Section({ title, hint, list }: { title: string; hint: string; list: Pool[] }) {
  if (list.length === 0) return null;
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
        <p className="text-meta text-muted-foreground">{hint}</p>
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <PoolCard key={s.id} pool={s} />
        ))}
      </div>
    </section>
  );
}

function PoolsPage() {
  const pools = useQuery(browsePoolsQuery);
  const list = pools.data ?? [];
  const funding = list.filter((s) => s.status === "open");
  const locked = list.filter((s) => s.status === "locked");
  const settled = list.filter((s) => s.status === "settled" || s.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Pools</h1>
        <p className="text-sm text-muted-foreground">
          Pool virtual currency with other traders and split winnings by shares owned.
        </p>
      </div>

      {pools.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-sm text-muted-foreground">
          <Users2 className="size-4" />
          No public pools yet. Open a market and start the first pool.
        </p>
      ) : (
        <>
          <Section title="Funding now" hint="Still taking contributions." list={funding} />
          <Section title="Locked" hint="Position is live and awaiting resolution." list={locked} />
          <Section title="Settled" hint="Payouts and refunds already distributed." list={settled} />
        </>
      )}
    </div>
  );
}