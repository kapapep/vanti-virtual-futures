import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { PostComposer } from "@/components/vanti/post-composer";
import { useSession } from "@/hooks/use-vanti-session";
import { supabase } from "@/integrations/supabase/client";
import { repliesQuery, poolPostsQuery } from "@/lib/posts";

/**
 * The per-market discussion component, scoped to a pool instead of a
 * market, with realtime inserts so the group chat feels live.
 */
export function PoolChat({ poolId, canPost }: { poolId: string; canPost: boolean }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const posts = useQuery(poolPostsQuery(poolId, user?.id));
  const list = posts.data ?? [];
  const replies = useQuery(repliesQuery(list.map((p) => p.id), user?.id));

  useEffect(() => {
    const channel = supabase
      .channel(`pool-chat-${poolId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `syndicate_id=eq.${poolId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["pool-posts", poolId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [poolId, queryClient]);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-extrabold text-foreground">Group chat</h2>
        {list.length > 0 ? (
          <span className="num text-meta text-muted-foreground">{list.length} messages</span>
        ) : null}
      </div>

      {canPost ? (
        <PostComposer
          poolId={poolId}
          lockedMarket
          compact
          placeholder="Message your pool"
        />
      ) : (
        <p className="text-meta text-muted-foreground">Contribute to join the conversation.</p>
      )}

      {posts.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No messages yet. Say something to the group." />
      ) : (
        <div className="space-y-2">
          {list.map((post) => (
            <PostCard key={post.id} post={post} replies={replies.data?.[post.id] ?? []} hideMarket />
          ))}
        </div>
      )}
    </section>
  );
}