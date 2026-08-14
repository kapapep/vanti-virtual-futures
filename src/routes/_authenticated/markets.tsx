import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      return list.sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0));
    default:
      return list.sort((a, b) => b.volume - a.volume);
  }
}

function useAutoScrollRail(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let paused = false;
    let direction = 1;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;

    const pause = () => {
      paused = true;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        paused = false;
      }, 3000);
    };

    const step = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (!paused && max > 4) {
        if (el.scrollLeft >= max - 1) direction = -1;
        else if (el.scrollLeft <= 0) direction = 1;
        el.scrollLeft += direction * 0.4;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const events = ["pointerdown", "wheel", "touchstart", "focusin", "mouseenter"] as const;
    events.forEach((e) => el.addEventListener(e, pause, { passive: true }));

    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      events.forEach((e) => el.removeEventListener(e, pause));
    };
  }, [enabled]);

  return ref;
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

  const activeSort = SORTS.find((s) => s.key === sort) ?? SORTS[0];
  const railRef = useAutoScrollRail((categories.data?.length ?? 0) > 0);

  return (
    <section className="space-y-6">
      <h1 className="text-figure font-semibold text-foreground">Markets</h1>

      <div className="sticky top-[57px] z-10 -mx-4 border-b border-border bg-background px-4 pb-2 pt-2 lg:top-0">
        {/* The filter button owns its own grid slot, so chips never scroll under it. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div
            ref={railRef}
            className="-ml-4 flex min-w-0 snap-x items-center gap-2 overflow-x-auto pl-4 pr-1 [scrollbar-width:none] sm:ml-0 sm:pl-0 [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              onClick={() => navigate({ search: (prev: MarketsSearch) => ({ ...prev, category: undefined }) })}
              className={cn(
                "inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-3.5 text-xs font-medium transition-colors duration-150 sm:min-h-8",
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
                  "inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 sm:min-h-8",
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 border-border px-3 text-xs font-medium text-foreground"
              >
                <SlidersHorizontal className="size-3.5" />
                <span className="hidden sm:inline">{activeSort.label}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) =>
                  navigate({ search: (prev: MarketsSearch) => ({ ...prev, sort: value as SortKey }) })
                }
              >
                {SORTS.map((s) => (
                  <DropdownMenuRadioItem key={s.key} value={s.key} className="text-xs">
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <h2 className="text-base font-semibold text-foreground">Trending</h2>
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
