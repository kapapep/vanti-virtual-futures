import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CategoryIcon } from "@/components/vanti/category-icon";
import { TradableMarketCard } from "@/components/vanti/tradable-market-card";
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

  const trending = [...filtered]
    .filter((m) => m.status === "active")
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Find a question, then buy YES or NO right from the card.
        </p>
      </div>

      <div className="sticky top-[57px] z-10 -mx-4 space-y-2 border-b border-border bg-background px-4 pb-2 pt-2 lg:top-0">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, category: undefined }) })}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors duration-150 sm:min-h-8",
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
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 sm:min-h-8",
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
        <div className="-mx-4 flex min-w-0 gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, sort: s.key }) })}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 sm:min-h-8",
                sort === s.key
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="num hidden shrink-0 text-meta text-muted-foreground sm:block">
          {filtered.length} markets
        </p>
      </div>
      </div>

      {markets.isPending ? (
        <MarketGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No markets here yet. Pick another category to keep browsing.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {trending.length > 0 ? (
            <section className="space-y-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold text-foreground">Trending</h2>
                <p className="text-meta text-muted-foreground">Highest virtual volume right now.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {trending.map((m) => (
                  <TradableMarketCard key={m.id} market={m} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">All markets</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((market) => (
                <TradableMarketCard key={market.id} market={market} />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
