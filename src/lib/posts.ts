import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { fetchHiddenAuthorIds } from "@/lib/moderation-actions";

export type PostAuthor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  marketId: string | null;
  parentId: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  author: PostAuthor;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};

const POST_SELECT =
  "id, body, created_at, market_id, parent_id, image_url, audio_url, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)";

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  market_id: string | null;
  parent_id: string | null;
  image_url: string | null;
  audio_url: string | null;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** Attaches like/repost/reply counts and the viewer's own interaction state. */
async function hydrate(rows: PostRow[], viewerId: string | undefined): Promise<FeedPost[]> {
  const hidden = await fetchHiddenAuthorIds(viewerId);
  const visible = rows.filter((r) => r.profiles && !hidden.has(r.profiles.id));
  const ids = visible.map((r) => r.id);
  if (ids.length === 0) return [];

  const [likesRes, repostsRes, repliesRes] = await Promise.all([
    supabase.from("likes").select("post_id, user_id").in("post_id", ids),
    supabase.from("reposts").select("post_id, user_id").in("post_id", ids),
    supabase.from("posts").select("parent_id").in("parent_id", ids),
  ]);
  if (likesRes.error) throw likesRes.error;
  if (repostsRes.error) throw repostsRes.error;
  if (repliesRes.error) throw repliesRes.error;

  const likeCount = new Map<string, number>();
  const likedByViewer = new Set<string>();
  for (const row of likesRes.data ?? []) {
    likeCount.set(row.post_id, (likeCount.get(row.post_id) ?? 0) + 1);
    if (viewerId && row.user_id === viewerId) likedByViewer.add(row.post_id);
  }
  const repostCount = new Map<string, number>();
  const repostedByViewer = new Set<string>();
  for (const row of repostsRes.data ?? []) {
    repostCount.set(row.post_id, (repostCount.get(row.post_id) ?? 0) + 1);
    if (viewerId && row.user_id === viewerId) repostedByViewer.add(row.post_id);
  }
  const replyCount = new Map<string, number>();
  for (const row of repliesRes.data ?? []) {
    if (!row.parent_id) continue;
    replyCount.set(row.parent_id, (replyCount.get(row.parent_id) ?? 0) + 1);
  }

  return visible
    .filter((row) => row.profiles)
    .map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      marketId: row.market_id,
      parentId: row.parent_id,
      imageUrl: row.image_url,
      audioUrl: row.audio_url,
      author: {
        id: row.profiles!.id,
        username: row.profiles!.username,
        displayName: row.profiles!.display_name,
        avatarUrl: row.profiles!.avatar_url,
      },
      likeCount: likeCount.get(row.id) ?? 0,
      repostCount: repostCount.get(row.id) ?? 0,
      replyCount: replyCount.get(row.id) ?? 0,
      likedByViewer: likedByViewer.has(row.id),
      repostedByViewer: repostedByViewer.has(row.id),
    }));
}

export function engagementScore(post: FeedPost) {
  return post.likeCount + post.repostCount * 2 + post.replyCount * 2;
}

/**
 * Ranks the For You feed by engagement with a recency decay, so a brand-new
 * post (including the viewer's own) surfaces at the top instead of sinking
 * below older, more-engaged posts.
 */
function forYouRank(post: FeedPost, now: number) {
  const hours = Math.max(0, (now - new Date(post.createdAt).getTime()) / 3_600_000);
  return (engagementScore(post) + 1) / Math.pow(hours + 2, 1.2);
}

export const FEED_PAGE_SIZE = 15;

/** Posts from followed traders plus posts on watched markets, newest first. */
export async function fetchFollowingFeed(input: {
  viewerId: string | undefined;
  followingIds: string[];
  watchedMarketIds: string[];
  offset: number;
}): Promise<FeedPost[]> {
  const authors = [...new Set([...input.followingIds, ...(input.viewerId ? [input.viewerId] : [])])];
  const filters: string[] = [];
  if (authors.length) filters.push(`user_id.in.(${authors.join(",")})`);
  if (input.watchedMarketIds.length) filters.push(`market_id.in.(${input.watchedMarketIds.join(",")})`);
  if (filters.length === 0) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_id", null)
    .or(filters.join(","))
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + FEED_PAGE_SIZE - 1);
  if (error) throw error;
  return hydrate((data ?? []) as PostRow[], input.viewerId);
}

/** Fallback feed: the most-engaged recent posts across all of Vanti. */
export async function fetchForYouFeed(viewerId: string | undefined): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  const posts = await hydrate((data ?? []) as PostRow[], viewerId);
  const now = Date.now();
  return posts.sort((a, b) => forYouRank(b, now) - forYouRank(a, now));
}

/** Top-level posts attached to one market, newest first. */
export function marketPostsQuery(marketId: string, viewerId: string | undefined) {
  return queryOptions({
    queryKey: ["market-posts", marketId, viewerId],
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("market_id", marketId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return hydrate((data ?? []) as PostRow[], viewerId);
    },
  });
}

/** One level of replies for a set of parent posts. */
export function poolPostsQuery(poolId: string, viewerId: string | undefined) {
  return queryOptions({
    queryKey: ["pool-posts", poolId, viewerId],
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("syndicate_id", poolId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return hydrate((data ?? []) as PostRow[], viewerId);
    },
  });
}

/** One level of replies for a set of parent posts. */
export function repliesQuery(parentIds: string[], viewerId: string | undefined) {
  const key = [...parentIds].sort().join(",");
  return queryOptions({
    queryKey: ["post-replies", key, viewerId],
    enabled: parentIds.length > 0,
    queryFn: async (): Promise<Record<string, FeedPost[]>> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .in("parent_id", parentIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const posts = await hydrate((data ?? []) as PostRow[], viewerId);
      const grouped: Record<string, FeedPost[]> = {};
      for (const post of posts) {
        if (!post.parentId) continue;
        (grouped[post.parentId] ??= []).push(post);
      }
      return grouped;
    },
  });
}

/** Posts written by one trader, for their public profile. */
export function userPostsQuery(userId: string | undefined, viewerId: string | undefined) {
  return queryOptions({
    queryKey: ["user-posts", userId, viewerId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return hydrate((data ?? []) as PostRow[], viewerId);
    },
  });
}

export function followingIdsQuery(viewerId: string | undefined) {
  return queryOptions({
    queryKey: ["following-ids", viewerId],
    enabled: Boolean(viewerId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", viewerId!);
      if (error) throw error;
      return (data ?? []).map((row) => row.following_id);
    },
  });
}

export type SuggestedAccount = PostAuthor & { postCount: number };

/** Active traders the viewer does not follow yet. */
export function suggestedAccountsQuery(viewerId: string | undefined, followingIds: string[]) {
  return queryOptions({
    queryKey: ["suggested-accounts", viewerId, followingIds.length],
    queryFn: async (): Promise<SuggestedAccount[]> => {
      const [profilesRes, postsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url").limit(200),
        supabase.from("posts").select("user_id").limit(1000),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (postsRes.error) throw postsRes.error;

      const counts = new Map<string, number>();
      for (const row of postsRes.data ?? []) {
        counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
      }
      const excluded = new Set([...followingIds, ...(viewerId ? [viewerId] : [])]);
      return (profilesRes.data ?? [])
        .filter((p) => !excluded.has(p.id))
        .map((p) => ({
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          postCount: counts.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 5);
    },
  });
}

export async function createPost(input: {
  userId: string;
  body: string;
  marketId?: string | null;
  poolId?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}) {
  const body = input.body.trim();
  const hasMedia = Boolean(input.imageUrl || input.audioUrl);
  if (!body && !hasMedia) throw new Error("Write something first.");
  if (body.length > 500) throw new Error("Posts are limited to 500 characters.");
  const { error } = await supabase.from("posts").insert({
    user_id: input.userId,
    body,
    market_id: input.marketId ?? null,
    syndicate_id: input.poolId ?? null,
    parent_id: input.parentId ?? null,
    image_url: input.imageUrl ?? null,
    audio_url: input.audioUrl ?? null,
  });
  if (error) {
    if (error.message.includes("ACCOUNT_SUSPENDED")) {
      throw new Error("Your account is suspended for 7 days for violating the posting rules.");
    }
    throw error;
  }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function setLike(input: { userId: string; postId: string; liked: boolean }) {
  if (input.liked) {
    const { error } = await supabase
      .from("likes")
      .insert({ user_id: input.userId, post_id: input.postId });
    if (error && !error.message.includes("duplicate")) throw error;
    return;
  }
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("user_id", input.userId)
    .eq("post_id", input.postId);
  if (error) throw error;
}

export async function setRepost(input: { userId: string; postId: string; reposted: boolean }) {
  if (input.reposted) {
    const { error } = await supabase
      .from("reposts")
      .insert({ user_id: input.userId, post_id: input.postId });
    if (error && !error.message.includes("duplicate")) throw error;
    return;
  }
  const { error } = await supabase
    .from("reposts")
    .delete()
    .eq("user_id", input.userId)
    .eq("post_id", input.postId);
  if (error) throw error;
}

export type SearchResults = {
  markets: { id: string; question: string; yesPrice: number; status: string }[];
  users: PostAuthor[];
};

export function searchQuery(term: string) {
  const query = term.trim();
  return queryOptions({
    queryKey: ["global-search", query.toLowerCase()],
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SearchResults> => {
      const pattern = `%${query.replace(/[%_,]/g, "")}%`;
      const [marketsRes, usersRes] = await Promise.all([
        supabase
          .from("markets")
          .select("id, question, yes_price, status")
          .ilike("question", pattern)
          .order("volume", { ascending: false })
          .limit(8),
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .limit(8),
      ]);
      if (marketsRes.error) throw marketsRes.error;
      if (usersRes.error) throw usersRes.error;
      return {
        markets: (marketsRes.data ?? []).map((m) => ({
          id: m.id,
          question: m.question,
          yesPrice: Number(m.yes_price),
          status: m.status,
        })),
        users: (usersRes.data ?? []).map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
        })),
      };
    },
  });
}
