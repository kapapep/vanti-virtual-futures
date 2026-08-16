import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Repeat2, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarketEmbed } from "@/components/vanti/market-embed";
import { PostActionsMenu } from "@/components/vanti/post-actions-menu";
import { PostComposer } from "@/components/vanti/post-composer";
import { useSession } from "@/hooks/use-vanti-session";
import { formatRelativeTime } from "@/lib/format";
import { deletePost, setLike, setRepost, type FeedPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

function initials(post: FeedPost) {
  return (post.author.displayName ?? post.author.username).slice(0, 2).toUpperCase();
}

function ActionButton({
  label,
  count,
  active,
  activeClassName,
  icon: Icon,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  activeClassName?: string;
  icon: typeof Heart;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-meta font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        active && activeClassName,
      )}
    >
      <Icon className={cn("size-4", active && "fill-current")} />
      {typeof count === "number" && count > 0 ? <span className="num">{count}</span> : null}
    </button>
  );
}

/** A single post: author, body, optional embedded market and the action row. */
export function PostCard({
  post,
  replies = [],
  nested = false,
  hideMarket = false,
}: {
  post: FeedPost;
  replies?: FeedPost[];
  nested?: boolean;
  hideMarket?: boolean;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["market-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["post-replies"] });
    void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
  }

  const like = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to like posts.");
      return setLike({ userId: user.id, postId: post.id, liked: !post.likedByViewer });
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const repost = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sign in to repost.");
      return setRepost({ userId: user.id, postId: post.id, reposted: !post.repostedByViewer });
    },
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      refresh();
      toast.success("Post deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function share() {
    const path = post.marketId
      ? `/market/${post.marketId}`
      : `/u/${post.author.username}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <article
      className={cn(
        "flex gap-3 rounded-lg border border-border bg-card p-4",
        nested && "rounded-none border-0 border-t border-border bg-transparent p-3 pl-0",
      )}
    >
      <Link to="/u/$username" params={{ username: post.author.username }} className="shrink-0">
        <Avatar className={cn("size-9 border border-border", nested && "size-7")}>
          {post.author.avatarUrl ? (
            <AvatarImage src={post.author.avatarUrl} alt={post.author.username} />
          ) : null}
          <AvatarFallback className="bg-secondary text-xs font-medium">
            {initials(post)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-meta text-muted-foreground">
          <Link
            to="/u/$username"
            params={{ username: post.author.username }}
            className="text-sm font-semibold text-foreground hover:text-accent-solid"
          >
            {post.author.displayName ?? post.author.username}
          </Link>
          <span>@{post.author.username}</span>
          <span aria-hidden>·</span>
          <time dateTime={post.createdAt} className="num">
            {formatRelativeTime(post.createdAt)}
          </time>
          <div className="ml-auto flex items-center gap-0.5">
            {user?.id === post.author.id ? (
              <button
                type="button"
                onClick={() => remove.mutate()}
                aria-label="Delete post"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-negative"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <PostActionsMenu
              postId={post.id}
              authorId={post.author.id}
              username={post.author.username}
            />
          </div>
        </div>

        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {post.body}
        </p>

        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={`Image posted by @${post.author.username}`}
            loading="lazy"
            className="mt-3 max-h-[28rem] w-full rounded-lg border border-border object-cover"
          />
        ) : null}

        {post.audioUrl ? (
          <audio
            src={post.audioUrl}
            controls
            preload="none"
            className="mt-3 h-11 w-full"
            aria-label={`Voice note from @${post.author.username}`}
          />
        ) : null}

        {post.marketId && !hideMarket ? (
          <div className="mt-3">
            <MarketEmbed marketId={post.marketId} />
          </div>
        ) : null}

        {!nested ? (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <ActionButton
              label="Reply"
              icon={MessageCircle}
              count={post.replyCount}
              onClick={() => {
                setReplying((v) => !v);
                setShowReplies(true);
              }}
            />
            <ActionButton
              label="Repost"
              icon={Repeat2}
              count={post.repostCount}
              active={post.repostedByViewer}
              activeClassName="text-positive"
              onClick={() => repost.mutate()}
            />
            <ActionButton
              label="Like"
              icon={Heart}
              count={post.likeCount}
              active={post.likedByViewer}
              activeClassName="text-negative"
              onClick={() => like.mutate()}
            />
            <ActionButton label="Share" icon={Share2} onClick={() => void share()} />
          </div>
        ) : null}

        {replying ? (
          <div className="mt-2">
            <PostComposer
              parentId={post.id}
              compact
              placeholder={`Reply to @${post.author.username}`}
              onPosted={() => setReplying(false)}
            />
          </div>
        ) : null}

        {!nested && replies.length > 0 ? (
          showReplies ? (
            <div className="mt-1">
              {replies.map((reply) => (
                <PostCard key={reply.id} post={reply} nested />
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReplies(true)}
              className="mt-1 text-meta font-medium text-accent-solid hover:underline"
            >
              Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )
        ) : null}
      </div>
    </article>
  );
}
