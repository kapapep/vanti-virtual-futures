import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PoolCard } from "@/components/vanti/pool-card";
import { browsePoolsQuery, type Pool } from "@/lib/pools";

type SectionKey = "funding" | "locking" | "members" | "active";

const SECTIONS: Record<SectionKey, { title: string; hint: string }> = {
  funding: { title: "Funding now", hint: "Still taking contributions." },
  locking: { title: "Locking soon", hint: "Closing within 24 hours." },
  members: { title: "Most members", hint: "Busiest pools still open to join." },
  active: { title: "Active", hint: "Locked pools holding live positions." },
};

export const Route = createFileRoute("/_authenticated/pools/")({
  validateSearch: (search: Record<string, unknown>) => ({
    section:
      typeof search["section"] === "string" && search["section"] in SECTIONS
        ? (search["section"] as SectionKey)
        : undefined,
  }),
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

const DAY_MS = 24 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function lockMs(pool: Pool) {
  return new Date(pool.lockAt).getTime() - Date.now();
}

function buildSections(list: Pool[]): Record<SectionKey, Pool[]> {
  const open = list.filter((p) => p.status === "open");
  return {
    funding: [...open].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    locking: open
      .filter((p) => {
        const ms = lockMs(p);
        return ms > 0 && ms <= DAY_MS;
      })
      .sort((a, b) => lockMs(a) - lockMs(b)),
    members: open
      .filter((p) => p.memberCount < p.maxMembers)
      .sort((a, b) => b.memberCount - a.memberCount),
    active: list
      .filter((p) => p.status === "locked")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

function cardProps(key: SectionKey, pool: Pool) {
  return {
    urgent: key === "locking" && lockMs(pool) <= SIX_HOURS_MS,
    showPnl: key === "active",
  };
}

/** One horizontally scrolling row with a header and a "See all" link. */
function Carousel({ sectionKey, list }: { sectionKey: SectionKey; list: Pool[] }) {
  if (list.length === 0) return null;
  const { title, hint } = SECTIONS[sectionKey];

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
          <p className="text-meta text-muted-foreground">{hint}</p>
        </div>
        <Link
          to="/pools"
          search={{ section: sectionKey }}
          className="shrink-0 text-meta font-extrabold text-accent-solid hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {list.map((pool) => (
          <div key={pool.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
            <PoolCard pool={pool} {...cardProps(sectionKey, pool)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PoolsPage() {
  const { section } = Route.useSearch();
  const pools = useQuery(browsePoolsQuery);
  const list = pools.data ?? [];
  const sections = buildSections(list);
  const keys: SectionKey[] = ["funding", "locking", "members", "active"];
  const empty = keys.every((k) => sections[k].length === 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Pools</h1>
        <p className="text-sm text-muted-foreground">
          Pool virtual currency with other traders and split winnings by shares owned.
        </p>
      </div>

      {pools.isPending ? (
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-28 w-[280px] shrink-0 rounded-lg" />
          <Skeleton className="h-28 w-[280px] shrink-0 rounded-lg" />
          <Skeleton className="h-28 w-[280px] shrink-0 rounded-lg" />
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-12 text-center">
          <Users2 className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No public pools yet. Open a market and start the first pool.
          </p>
          <Link
            to="/markets"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-solid px-4 text-sm font-extrabold text-accent-solid-foreground"
          >
            <Plus className="size-4" />
            Start a pool
          </Link>
        </div>
      ) : section ? (
        <section className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-foreground">{SECTIONS[section].title}</h2>
              <p className="text-meta text-muted-foreground">{SECTIONS[section].hint}</p>
            </div>
            <Link
              to="/pools"
              search={{ section: undefined }}
              className="shrink-0 text-meta font-extrabold text-accent-solid hover:underline"
            >
              Back to all
            </Link>
          </div>
          <div className="space-y-2">
            {sections[section].map((pool) => (
              <PoolCard key={pool.id} pool={pool} {...cardProps(section, pool)} />
            ))}
          </div>
        </section>
      ) : (
        keys.map((key) => <Carousel key={key} sectionKey={key} list={sections[key]} />)
      )}

      {!empty ? (
        <Link
          to="/markets"
          aria-label="Start a pool"
          className="fixed bottom-24 right-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-accent-solid px-5 text-sm font-extrabold text-accent-solid-foreground shadow-lg lg:bottom-8"
        >
          <Plus className="size-4" />
          Start a pool
        </Link>
      ) : null}
    </div>
  );
}
