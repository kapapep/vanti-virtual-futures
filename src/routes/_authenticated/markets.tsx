import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CategoryIcon } from "@/components/vanti/category-icon";
import { MarketCard } from "@/components/vanti/market-card";
import { MarketGridSkeleton } from "@/components/vanti/skeletons";
import { categoriesQuery, marketsQuery, type Market } from "@/lib/markets";
import { cn } from "@/lib/utils";

const SORTS = [
  { key: "volume", label: "Volume" },
  { key: "newest", label: "Newest" },
  { key: "ending", label: "Ending Soon" },
  { key: "move", label: "Biggest Move" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];
type MarketsSearch = { category?: string | undefined; sort?: SortKey | undefined };

function sortMarkets(markets: Market[], sort: SortKey) {
  const list = [...markets];
  switch (sort) {
    case "newest":
      return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "ending":
      return list.sort((a, b) => +new Date(a.resolutionDate) - +new Date(b.resolutionDate));
    case "move":
      return list.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    default:
      return list.sort((a, b) => b.volume - a.volume);
  }
}

export const Route = createFileRoute("/_authenticated/markets")({
  validateSearch: (search: Record<string, unknown>): MarketsSearch => ({
    category: typeof search["category"] === "string" ? (search["category"] as string) : undefined,
    sort: SORTS.some((s) => s.key === search["sort"]) ? (search["sort"] as SortKey) : ("volume" as SortKey),
  }),
  head: () => ({
    meta: [
      { title: "Markets — Vanti" },
      { name: "description", content: "All Vanti virtual-money prediction markets." },
      { property: "og:title", content: "Markets — Vanti" },
      { property: "og:description", content: "All Vanti virtual-money prediction markets." },
    ],
  }),
  component: MarketsPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
});

function MarketsPage() {
  const { category, sort = "volume" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const markets = useQuery(marketsQuery);
  const categories = useQuery(categoriesQuery);

  const filtered = markets.data
    ? sortMarkets(
        markets.data.filter((m) => !category || m.category?.slug === category),
        sort,
      )
    : [];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Every market with YES/NO pricing in cents, volume and resolution details.
        </p>
      </div>

      <div className="sticky top-14 z-10 -mx-4 space-y-2 border-b border-border bg-background/95 px-4 pb-2 pt-2 backdrop-blur lg:top-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, category: undefined }) })}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-3.5 text-meta font-medium transition-colors duration-150 sm:min-h-8",
            !category
              ? "border-accent-solid bg-accent-subtle text-accent-solid"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {(categories.data ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, category: c.slug }) })}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-meta font-medium transition-colors duration-150 sm:min-h-8",
              category === c.slug
                ? "border-accent-solid bg-accent-subtle text-accent-solid"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <CategoryIcon name={c.icon} className="size-3" />
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
        <div className="flex flex-wrap gap-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, sort: s.key }) })}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-2.5 text-meta font-semibold transition-colors duration-150 sm:min-h-8",
                sort === s.key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="num shrink-0 text-meta text-muted-foreground">{filtered.length} markets</p>
      </div>
      </div>

      {markets.isPending ? (
        <MarketGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No markets here yet. Pick another category to keep browsing.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </section>
  );
}
