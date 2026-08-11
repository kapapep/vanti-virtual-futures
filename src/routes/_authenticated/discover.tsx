import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/vanti/category-icon";
import { TradableMarketCard } from "@/components/vanti/tradable-market-card";
import { MarketGridSkeleton } from "@/components/vanti/skeletons";
import { categoriesQuery, marketsQuery, type Market } from "@/lib/markets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover & Trade — Vanti" },
      {
        name: "description",
        content: "Browse Vanti categories and trade trending virtual markets in one place.",
      },
      { property: "og:title", content: "Discover & Trade — Vanti" },
      {
        property: "og:description",
        content: "Browse Vanti categories and trade trending virtual markets in one place.",
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
          <TradableMarketCard key={m.id} market={m} />
        ))}
      </div>
    </section>
  );
}

function DiscoverPage() {
  const markets = useQuery(marketsQuery);
  const categories = useQuery(categoriesQuery);
  const [category, setCategory] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    let dir = 1;
    const speed = 22; // px per second

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const max = el.scrollWidth - el.clientWidth;
      if (!pausedRef.current && max > 4) {
        let next = el.scrollLeft + dir * speed * dt;
        if (next >= max) {
          next = max;
          dir = -1;
        } else if (next <= 0) {
          next = 0;
          dir = 1;
        }
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => {
      pausedRef.current = true;
    };
    const resume = () => {
      pausedRef.current = false;
    };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("focusin", pause);
    el.addEventListener("focusout", resume);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("focusout", resume);
    };
  }, [categories.data]);

  const all = markets.data ?? [];
  const active = all.filter(
    (m) => m.status === "active" && (!category || m.category?.slug === category),
  );

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
        <h1 className="text-figure font-semibold text-foreground">Discover & Trade</h1>
        <p className="text-sm text-muted-foreground">
          Find a question, then buy YES or NO right from the card.
        </p>
      </div>

      <section
        ref={railRef}
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
              category === null
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
              onClick={() => setCategory(c.slug === category ? null : c.slug)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                category === c.slug
                  ? "border-accent-solid bg-accent-subtle text-accent-solid"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <CategoryIcon name={c.icon} className="size-3.5" />
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {markets.isPending ? (
        <div className="space-y-10">
          {Array.from({ length: 2 }, (_, s) => (
            <div key={s} className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <MarketGridSkeleton count={3} />
            </div>
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
    </div>
  );
}
