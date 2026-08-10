import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  body: z.string().max(500).optional(),
  imageDataUrl: z.string().max(3_000_000).optional(),
  audioDataUrl: z.string().max(3_000_000).optional(),
  audioFormat: z.string().max(8).optional(),
});

export type ModerationVerdict = { explicit: boolean; reason: string };

const RULES = [
  "You are the content-safety reviewer for Vanti, a virtual-money prediction market.",
  "Flag content as explicit when it contains: nudity or sexual activity, sexualized minors,",
  "pornographic text, graphic violence or gore, or sexual solicitation.",
  'Reply with strict JSON only: {"explicit": boolean, "reason": string}.',
  "Keep reason under 12 words. Ordinary photos, charts, memes, and market talk are not explicit.",
].join(" ");

/** Screens post media for explicit content before the post is published. */
export const moderatePostMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ModerationVerdict> => {
    if (!data.imageDataUrl && !data.audioDataUrl) return { explicit: false, reason: "" };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { explicit: false, reason: "" };

    const content: unknown[] = [
      {
        type: "text",
        text: `${RULES}\n\nPost text: ${data.body?.slice(0, 500) ?? "(none)"}`,
      },
    ];
    if (data.imageDataUrl) {
      content.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }
    if (data.audioDataUrl) {
      const base64 = data.audioDataUrl.split(",")[1] ?? "";
      if (base64) {
        content.push({
          type: "input_audio",
          input_audio: { data: base64, format: data.audioFormat ?? "webm" },
        });
      }
    }

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content }],
          max_tokens: 120,
        }),
      });
      if (!response.ok) {
        console.error("moderation request failed", response.status, await response.text());
        return { explicit: false, reason: "" };
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return { explicit: false, reason: "" };
      const parsed = JSON.parse(match[0]) as { explicit?: unknown; reason?: unknown };
      return {
        explicit: parsed.explicit === true,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
      };
    } catch (error) {
      console.error("moderation error", error);
      return { explicit: false, reason: "" };
    }
  });
