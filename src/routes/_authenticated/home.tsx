import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { PostComposer } from "@/components/vanti/post-composer";
import { useSession } from "@/hooks/use-vanti-session";
import { formatCents, formatDelta, formatRelativeTime } from "@/lib/format";
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
  head: () => ({
    meta: [
      { title: "Home — Vanti Prediction Markets" },
      {
        name: "description",
        content:
          "Your Vanti home feed: posts from traders you follow, discussion on watched markets and live price moves.",
      },
      { property: "og:title", content: "Home — Vanti Prediction Markets" },
      {
        property: "og:description",
        content:
          "Your Vanti home feed: posts from traders you follow, discussion on watched markets and live price moves.",
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

/** A generated notice about a big price move on a market the viewer watches. */
type PriceMoveItem = { kind: "move"; id: string; market: Market; at: number };
type FeedItem = { kind: "post"; post: FeedPost; at: number } | PriceMoveItem;

function PriceMoveCard({ market }: { market: Market }) {
  const up = market.change24h >= 0;
  return (
    <article className="flex gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        <Activity className="size-4 text-accent-solid" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold uppercase text-muted-foreground">
          Price move · watchlist
        </p>
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
              "num inline-flex items-center gap-1 font-medium",
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
        Follow a few accounts to personalise your feed.
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
  const viewerId = user?.id;
  const following = useQuery(followingIdsQuery(viewerId));
  const watchlist = useQuery(watchlistQuery(viewerId));
  const markets = useQuery(marketsQuery);

  const followingIds = following.data ?? [];
  const watchedIds = watchlist.data ?? [];
  const ready = following.isSuccess && watchlist.isSuccess;
  const personalised = followingIds.length > 0 || watchedIds.length > 0;

  const feed = useInfiniteQuery({
    queryKey: ["feed", viewerId, personalised ? "following" : "for-you", followingIds.length, watchedIds.length],
    enabled: Boolean(viewerId) && ready,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (personalised) {
        return fetchFollowingFeed({
          viewerId,
          followingIds,
          watchedMarketIds: watchedIds,
          offset: pageParam as number,
        });
      }
      const all = await fetchForYouFeed(viewerId);
      const offset = pageParam as number;
      return all.slice(offset, offset + FEED_PAGE_SIZE);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < FEED_PAGE_SIZE ? undefined : allPages.length * FEED_PAGE_SIZE,
  });

  const posts = useMemo(() => (feed.data?.pages ?? []).flat(), [feed.data]);
  const replies = useQuery(repliesQuery(posts.map((p) => p.id), viewerId));

  const moveItems = useMemo<PriceMoveItem[]>(() => {
    const watched = new Set(watchedIds);
    return (markets.data ?? [])
      .filter((m) => watched.has(m.id) && Math.abs(m.change24h) >= MOVE_THRESHOLD)
      .slice(0, 3)
      .map((market) => ({
        kind: "move" as const,
        id: `move-${market.id}`,
        market,
        at: market.spark.length ? market.spark[market.spark.length - 1]!.t : Date.now(),
      }));
  }, [markets.data, watchedIds]);

  const items = useMemo<FeedItem[]>(() => {
    const postItems: FeedItem[] = posts.map((post) => ({
      kind: "post" as const,
      post,
      at: new Date(post.createdAt).getTime(),
    }));
    return [...moveItems, ...postItems].sort((a, b) => b.at - a.at);
  }, [posts, moveItems]);

  const loading = !ready || (feed.isPending && posts.length === 0);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-figure font-semibold text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground">
          {personalised
            ? "Posts from traders you follow and markets you watch."
            : "For You — the most active discussion on Vanti right now."}
        </p>
      </header>

      <PostComposer />

      {!personalised && ready ? (
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
          title="No posts yet. Follow a trader or watch a market to fill your feed."
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
              <PriceMoveCard key={item.id} market={item.market} />
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

      <p className="pt-2 text-center text-meta text-muted-foreground">
        Last updated <span className="num">{formatRelativeTime(new Date())}</span> · virtual money
        only
      </p>
    </div>
  );
}
