import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { PostComposer } from "@/components/vanti/post-composer";
import { useSession } from "@/hooks/use-vanti-session";
import { formatCents, formatDelta } from "@/lib/format";
import { marketsQuery, watchlistQuery, type Market } from "@/lib/markets";
import {
  FEED_PAGE_SIZE,
  fetchFollowingFeed,
  fetchForYouFeed,
  followingIdsQuery,
  repliesQuery,
  suggestedAccountsQuery,
  type FeedPost,
} from "@/lib/posts";
import { setFollowing } from "@/lib/social";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search['tab'] === "following" ? ("following" as const) : ("for-you" as const),
  }),
  head: () => ({
    meta: [
      { title: "Home — Vanti Prediction Markets" },
      {
        name: "description",
        content:
          "Your Vanti home feed: For You covers trending and losing trades, Following shows the traders you back.",
      },
      { property: "og:title", content: "Home — Vanti Prediction Markets" },
      {
        property: "og:description",
        content:
          "Your Vanti home feed: For You covers trending and losing trades, Following shows the traders you back.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
  errorComponent: ({ error }) => (
    <p role="alert" className="text-sm text-negative">
      {error.message}
    </p>
  ),
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Nothing here yet.</p>,
});

const MOVE_THRESHOLD = 0.05;

type Tab = "for-you" | "following";

/** A generated notice about a big price move. */
type PriceMoveItem = { kind: "move"; id: string; market: Market; label: string; at: number };
type FeedItem = { kind: "post"; post: FeedPost; at: number } | PriceMoveItem;

function PriceMoveCard({ market, label }: { market: Market; label: string }) {
  const up = market.change24h >= 0;
  return (
    <article className="flex gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        <Activity className="size-4 text-accent-solid" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-meta text-muted-foreground">{label}</p>
        <Link
          to="/market/$marketId"
          params={{ marketId: market.id }}
          className="mt-1 block text-sm font-medium leading-snug text-foreground hover:text-accent-solid"
        >
          {market.question}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-meta">
          <span
            className={cn(
              "num inline-flex items-center gap-1",
              up ? "text-positive" : "text-negative",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatDelta(market.change24h)} in 24h
          </span>
          <span className="num text-muted-foreground">
            YES now {formatCents(market.yesPrice)} · NO {formatCents(market.noPrice)}
          </span>
        </p>
      </div>
    </article>
  );
}

function SuggestedAccounts({
  viewerId,
  followingIds,
}: {
  viewerId: string | undefined;
  followingIds: string[];
}) {
  const queryClient = useQueryClient();
  const suggestions = useQuery(suggestedAccountsQuery(viewerId, followingIds));

  const follow = useMutation({
    mutationFn: (profileId: string) => {
      if (!viewerId) throw new Error("Sign in to follow traders.");
      return setFollowing({ viewerId, profileId, follow: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["following-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["follow-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Followed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if ((suggestions.data ?? []).length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Suggested traders</h2>
      <p className="mt-1 text-meta text-muted-foreground">
        Follow a few accounts to fill your Following feed.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {(suggestions.data ?? []).map((account) => (
          <li key={account.id} className="flex items-center gap-3 py-2.5">
            <Link to="/u/$username" params={{ username: account.username }}>
              <Avatar className="size-8 border border-border">
                {account.avatarUrl ? (
                  <AvatarImage src={account.avatarUrl} alt={account.username} />
                ) : null}
                <AvatarFallback className="bg-secondary text-xs font-medium">
                  {(account.displayName ?? account.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                to="/u/$username"
                params={{ username: account.username }}
                className="block truncate text-sm font-medium text-foreground hover:text-accent-solid"
              >
                {account.displayName ?? account.username}
              </Link>
              <p className="truncate text-meta text-muted-foreground">
                @{account.username} · <span className="num">{account.postCount}</span> posts
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={follow.isPending}
              onClick={() => follow.mutate(account.id)}
            >
              Follow
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomePage() {
  const { user } = useSession();
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();
  const viewerId = user?.id;
  const [composerOpen, setComposerOpen] = useState(false);
  const setTab = (next: Tab) => void navigate({ search: { tab: next }, replace: true });

  const following = useQuery(followingIdsQuery(viewerId));
  const watchlist = useQuery(watchlistQuery(viewerId));
  const markets = useQuery(marketsQuery);

  const followingIds = following.data ?? [];
  const watchedIds = watchlist.data ?? [];
  const ready = following.isSuccess && watchlist.isSuccess;

  const feed = useInfiniteQuery({
    queryKey: ["feed", viewerId, tab, followingIds.length, watchedIds.length],
    enabled: Boolean(viewerId) && ready,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      if (tab === "following") {
        return fetchFollowingFeed({
          viewerId,
          followingIds,
          watchedMarketIds: watchedIds,
          offset,
        });
      }
      const all = await fetchForYouFeed(viewerId);
      return all.slice(offset, offset + FEED_PAGE_SIZE);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < FEED_PAGE_SIZE ? undefined : allPages.length * FEED_PAGE_SIZE,
  });

  const posts = useMemo(() => (feed.data?.pages ?? []).flat(), [feed.data]);
  const replies = useQuery(repliesQuery(posts.map((p) => p.id), viewerId));

  /** For You surfaces the biggest movers overall; Following only watched markets. */
  const moveItems = useMemo<PriceMoveItem[]>(() => {
    const watched = new Set(watchedIds);
    const all = markets.data ?? [];
    const source =
      tab === "following"
        ? all.filter((m) => watched.has(m.id) && Math.abs(m.change24h) >= MOVE_THRESHOLD)
        : [...all]
            .filter((m) => Math.abs(m.change24h) >= MOVE_THRESHOLD)
            .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    return source.slice(0, 3).map((market) => ({
      kind: "move" as const,
      id: `move-${market.id}`,
      market,
      label:
        tab === "following"
          ? TREND_LABEL.WATCHLIST_MOVE
          : trendLabel(market.change24h),
      at: market.spark.length ? market.spark[market.spark.length - 1]!.t : Date.now(),
    }));
  }, [markets.data, watchedIds, tab]);

  const items = useMemo<FeedItem[]>(() => {
    const postItems: FeedItem[] = posts.map((post) => ({
      kind: "post" as const,
      post,
      at: new Date(post.createdAt).getTime(),
    }));
    return [...moveItems, ...postItems].sort((a, b) => b.at - a.at);
  }, [posts, moveItems]);

  const loading = !ready || (feed.isPending && posts.length === 0);
  const showSuggestions = tab === "following" && ready && followingIds.length === 0;

  return (
    <div className="space-y-5">
      {/* Mobile switcher lives in the top bar; desktop keeps it above the feed. */}
      <nav className="sticky top-0 z-10 -mt-6 hidden items-center justify-center gap-6 bg-background/95 pb-1 pt-0.5 backdrop-blur lg:flex">
        {(
          [
            { id: "for-you" as Tab, label: "For You" },
            { id: "following" as Tab, label: "Following" },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            className={cn(
              "relative min-h-11 px-2 text-sm transition-colors",
              tab === item.id ? "font-extrabold text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute inset-x-1 bottom-1 h-0.5 rounded-full",
                tab === item.id ? "bg-foreground" : "bg-transparent",
              )}
            />
          </button>
        ))}
      </nav>

      <h1 className="sr-only">Vanti home feed</h1>

      {showSuggestions ? (
        <SuggestedAccounts viewerId={viewerId} followingIds={followingIds} />
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={
            tab === "following"
              ? "Follow a trader to see their posts here."
              : "No trending posts yet. Be the first to post."
          }
          action={
            <Button asChild size="sm">
              <Link to="/discover">Discover markets</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            item.kind === "move" ? (
              <PriceMoveCard key={item.id} market={item.market} label={item.label} />
            ) : (
              <PostCard
                key={item.post.id}
                post={item.post}
                replies={replies.data?.[item.post.id] ?? []}
              />
            ),
          )}
        </div>
      )}

      {feed.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {/* Floating composer trigger */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          aria-label="Write a post"
          className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-accent-solid text-accent-solid-foreground shadow-lg transition-transform hover:scale-105 lg:bottom-8 lg:right-8"
        >
          <Plus className="size-6" />
        </button>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-base">New post</DialogTitle>
            <DialogDescription className="text-left text-meta">
              Share your read on a market. Virtual money only.
            </DialogDescription>
          </DialogHeader>
          <PostComposer compact onPosted={() => setComposerOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
