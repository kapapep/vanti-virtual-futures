import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

/** Ids the viewer has blocked or muted — their content is hidden everywhere. */
export function hiddenAuthorsQuery(viewerId: string | undefined) {
  return queryOptions({
    queryKey: ["hidden-authors", viewerId],
    enabled: Boolean(viewerId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ blocked: string[]; muted: string[] }> => {
      const [blocks, mutes] = await Promise.all([
        supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId!),
        supabase.from("mutes").select("muted_id").eq("muter_id", viewerId!),
      ]);
      if (blocks.error) throw blocks.error;
      if (mutes.error) throw mutes.error;
      return {
        blocked: (blocks.data ?? []).map((r) => r.blocked_id),
        muted: (mutes.data ?? []).map((r) => r.muted_id),
      };
    },
  });
}

/** Author ids whose posts must never render for this viewer. */
export async function fetchHiddenAuthorIds(viewerId: string | undefined): Promise<Set<string>> {
  if (!viewerId) return new Set();
  const [blocks, mutes] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId),
    supabase.from("mutes").select("muted_id").eq("muter_id", viewerId),
  ]);
  const ids = new Set<string>();
  for (const row of blocks.data ?? []) ids.add(row.blocked_id);
  for (const row of mutes.data ?? []) ids.add(row.muted_id);
  return ids;
}

export async function reportPost(input: {
  reporterId: string;
  postId: string;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    post_id: input.postId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
}

export async function setBlocked(input: {
  viewerId: string;
  userId: string;
  blocked: boolean;
}) {
  if (input.blocked) {
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: input.viewerId, blocked_id: input.userId });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
    return;
  }
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", input.viewerId)
    .eq("blocked_id", input.userId);
  if (error) throw error;
}

export async function setMuted(input: { viewerId: string; userId: string; muted: boolean }) {
  if (input.muted) {
    const { error } = await supabase
      .from("mutes")
      .insert({ muter_id: input.viewerId, muted_id: input.userId });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
    return;
  }
  const { error } = await supabase
    .from("mutes")
    .delete()
    .eq("muter_id", input.viewerId)
    .eq("muted_id", input.userId);
  if (error) throw error;
}
