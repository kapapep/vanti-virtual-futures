import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { PostComposer } from "@/components/vanti/post-composer";
import { useSession } from "@/hooks/use-vanti-session";
import { marketPostsQuery, repliesQuery } from "@/lib/posts";

/** Discussion thread for one market, with replies one level deep. */
export function MarketDiscussion({ marketId }: { marketId: string }) {
  const { user } = useSession();
  const posts = useQuery(marketPostsQuery(marketId, user?.id));
  const list = posts.data ?? [];
  const replies = useQuery(repliesQuery(list.map((p) => p.id), user?.id));

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Discussion</h2>
        {list.length > 0 ? (
          <span className="num text-meta text-muted-foreground">{list.length} posts</span>
        ) : null}
      </div>

      <PostComposer
        marketId={marketId}
        lockedMarket
        compact
        placeholder="Share your read on this market"
      />

      {posts.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No discussion yet. Be the first to post on this market." />
      ) : (
        <div className="space-y-2">
          {list.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              replies={replies.data?.[post.id] ?? []}
              hideMarket
            />
          ))}
        </div>
      )}
    </section>
  );
}
