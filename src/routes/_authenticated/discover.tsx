import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/vanti/category-icon";
import { MarketCard } from "@/components/vanti/market-card";
import { categoriesQuery, marketsQuery, type Market } from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Vanti" },
      { name: "description", content: "Browse Vanti categories and trending virtual markets." },
      { property: "og:title", content: "Discover — Vanti" },
      {
        property: "og:description",
        content: "Browse Vanti categories and trending virtual markets.",
      },
    ],
  }),
  component: DiscoverPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
});

function Section({
  title,
  description,
  markets,
}: {
  title: string;
  description: string;
  markets: Market[];
}) {
  if (markets.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-meta text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </div>
    </section>
  );
}

function DiscoverPage() {
  const markets = useQuery(marketsQuery);
  const categories = useQuery(categoriesQuery);
  const all = markets.data ?? [];
  const active = all.filter((m) => m.status === "active");

  const trending = [...active].sort((a, b) => b.volume - a.volume).slice(0, 3);
  const popular = [...active].sort((a, b) => b.traderCount - a.traderCount).slice(0, 3);
  const newest = [...active]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);
  const ending = [...active]
    .sort((a, b) => +new Date(a.resolutionDate) - +new Date(b.resolutionDate))
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Discover</h1>
        <p className="text-sm text-muted-foreground">
          Trending questions, the most-traded markets and everything closing soon.
        </p>
      </div>

      {markets.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <Section title="Trending" description="Highest virtual volume right now." markets={trending} />
          <Section title="Popular" description="Most traders holding a position." markets={popular} />
          <Section title="New" description="Recently opened markets." markets={newest} />
          <Section
            title="Ending Soon"
            description="Closest to their resolution date."
            markets={ending}
          />
        </>
      )}

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(categories.data ?? []).map((c) => {
            const count = all.filter((m) => m.category?.slug === c.slug).length;
            return (
              <Link
                key={c.id}
                to="/markets"
                search={{ category: c.slug, sort: "volume" as const }}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent-solid/50"
              >
                <CategoryIcon name={c.icon} className="size-4 text-accent-solid" />
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <span className="num text-meta text-muted-foreground">{count} markets</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
