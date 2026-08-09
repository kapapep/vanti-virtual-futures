import { Skeleton } from "@/components/ui/skeleton";

/** Matches MarketCard: 4px bar, chip row, 3-line question, price row, meta row. */
export function MarketCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="h-[4px] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-4 border-t border-border pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function MarketGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches PositionRow: badge + question on the left, four stats, sell button, 2px bar. */
export function PositionRowSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 @md:grid-cols-4 @3xl:w-[24rem] @3xl:shrink-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 @3xl:w-24 @3xl:shrink-0 @3xl:justify-end">
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="pt-2">
        <Skeleton className="h-[2px] w-full rounded-full" />
      </div>
    </div>
  );
}

/** Matches the portfolio header, summary row and positions list. */
export function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-[220px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {Array.from({ length: 3 }, (_, i) => (
          <PositionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Matches the public profile header and tab content. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 px-4 py-4">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}