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
};

export function profileByUsernameQuery(username: string) {
  return queryOptions({
    queryKey: ["public-profile", username],
    queryFn: async (): Promise<PublicProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, balance, created_at")
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

export async function updateOwnProfile(input: {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}) {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim() || null,
      bio: input.bio.trim() || null,
      avatar_url: input.avatarUrl.trim() || null,
    })
    .eq("id", input.userId);
  if (error) throw error;
}
