import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  balance: number;
  createdAt: string;
  hideFollowing: boolean;
};

export function profileByUsernameQuery(username: string) {
  return queryOptions({
    queryKey: ["public-profile", username],
    queryFn: async (): Promise<PublicProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, balance, created_at, hide_following")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("PROFILE_NOT_FOUND");
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        balance: Number(data.balance),
        createdAt: data.created_at,
        hideFollowing: Boolean(data.hide_following),
      };
    },
  });
}

export function followStatsQuery(profileId: string | undefined) {
  return queryOptions({
    queryKey: ["follow-stats", profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<{ followers: number; following: number }> => {
      const [followers, following, profile] = await Promise.all([
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", profileId!),
        supabase
          .from("follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", profileId!),
        supabase
          .from("profiles")
          .select("follower_count_display")
          .eq("id", profileId!)
          .maybeSingle(),
      ]);
      if (followers.error) throw followers.error;
      if (following.error) throw following.error;
      const override = profile.data?.follower_count_display;
      return {
        followers: override != null ? Number(override) : (followers.count ?? 0),
        following: following.count ?? 0,
      };
    },
  });
}

export function isFollowingQuery(viewerId: string | undefined, profileId: string | undefined) {
  return queryOptions({
    queryKey: ["is-following", viewerId, profileId],
    enabled: Boolean(viewerId && profileId && viewerId !== profileId),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", viewerId!)
        .eq("following_id", profileId!)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export async function setFollowing(input: {
  viewerId: string;
  profileId: string;
  follow: boolean;
}) {
  if (input.follow) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: input.viewerId, following_id: input.profileId });
    if (error && !error.message.includes("duplicate")) throw error;
    return;
  }
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", input.viewerId)
    .eq("following_id", input.profileId);
  if (error) throw error;
}

export type FollowListKind = "followers" | "following";

export type FollowListEntry = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

/** Followers are always public; a following list can be hidden by its owner. */
export function followListQuery(profileId: string | undefined, kind: FollowListKind) {
  return queryOptions({
    queryKey: ["follow-list", profileId, kind],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<FollowListEntry[]> => {
      const column = kind === "followers" ? "following_id" : "follower_id";
      const joined =
        kind === "followers"
          ? "profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)"
          : "profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio)";
      const { data, error } = await supabase
        .from("follows")
        .select(joined)
        .eq(column, profileId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      type Row = {
        profiles: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
        } | null;
      };
      return ((data ?? []) as unknown as Row[])
        .filter((row) => row.profiles)
        .map((row) => ({
          id: row.profiles!.id,
          username: row.profiles!.username,
          displayName: row.profiles!.display_name,
          avatarUrl: row.profiles!.avatar_url,
          bio: row.profiles!.bio,
        }));
    },
  });
}

export async function updateOwnProfile(input: {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  hideFollowing?: boolean;
}) {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim() || null,
      bio: input.bio.trim() || null,
      avatar_url: input.avatarUrl.trim() || null,
      ...(input.hideFollowing === undefined ? {} : { hide_following: input.hideFollowing }),
    })
    .eq("id", input.userId);
  if (error) throw error;
}
