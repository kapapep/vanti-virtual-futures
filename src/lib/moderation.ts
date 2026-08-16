import { supabase } from "@/integrations/supabase/client";
import { apiBaseUrl } from "@/lib/api-base";
import type { ModerationInput, ModerationVerdict } from "@/lib/moderation-types";

export type { ModerationVerdict };

/**
 * Client-side moderation call. On the web this hits the same origin; inside the
 * native shell it hits the deployed web origin (see apiBaseUrl).
 */
export async function moderatePostMedia(input: ModerationInput): Promise<ModerationVerdict> {
  if (!input.imageDataUrl && !input.audioDataUrl) return { explicit: false, reason: "" };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to post.");

  const response = await fetch(`${apiBaseUrl()}/api/public/moderate-media`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    console.error("moderation request failed", response.status);
    // Fail open: never block a post because moderation was unreachable.
    return { explicit: false, reason: "" };
  }
  return (await response.json()) as ModerationVerdict;
}
