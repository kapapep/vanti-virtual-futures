import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BackButton } from "@/components/vanti/back-button";
import { EmptyState } from "@/components/vanti/empty-state";
import { PostCard } from "@/components/vanti/post-card";
import { PostComposer } from "@/components/vanti/post-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-vanti-session";
import { postQuery, repliesQuery } from "@/lib/posts";

export const Route = createFileRoute("/_authenticated/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post — Vanti Prediction Markets" },
      {
        name: "description",
        content: "Read the full post, its market context and every reply from Vanti traders.",
      },
      { property: "og:title", content: "Post — Vanti Prediction Markets" },
      {
        property: "og:description",
        content: "Read the full post, its market context and every reply from Vanti traders.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostDetailPage,
  errorComponent: () => <EmptyState title="We couldn't load that post. Try again." />,
  notFoundComponent: () => <EmptyState title="That post is no longer available." />,
});

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { user } = useSession();
  const post = useQuery(postQuery(postId, user?.id));
  const replies = useQuery(repliesQuery([postId], user?.id));
  const thread = replies.data?.[postId] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <BackButton label="Back" showLabel />
        <h1 className="text-sm font-extrabold text-foreground">Post</h1>
      </div>

      {post.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : !post.data ? (
        <EmptyState title="That post is no longer available." />
      ) : (
        <>
          <PostCard post={post.data} linkToDetail={false} />

          <section className="space-y-2">
            <h2 className="eyebrow text-meta text-muted-foreground">
              {thread.length === 1 ? "1 reply" : `${thread.length} replies`}
            </h2>
            <PostComposer
              parentId={post.data.id}
              compact
              placeholder={`Reply to @${post.data.author.username}`}
            />
            <div className="rounded-lg border border-border bg-card px-4">
              {thread.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No replies yet. Start the thread.
                </p>
              ) : (
                thread.map((reply) => (
                  <PostCard key={reply.id} post={reply} nested linkToDetail={false} />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}