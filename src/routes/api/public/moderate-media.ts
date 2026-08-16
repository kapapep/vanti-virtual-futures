import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public HTTP endpoint so the native (Capacitor) app — which has no bundled
// server — can reach moderation on the deployed web origin. Auth is verified
// from the caller's Supabase bearer token inside the handler.
const inputSchema = z.object({
  body: z.string().max(500).optional(),
  imageDataUrl: z.string().max(3_000_000).optional(),
  audioDataUrl: z.string().max(3_000_000).optional(),
  audioFormat: z.string().max(8).optional(),
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/moderate-media")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const { reviewMedia, verifyBearerUser } = await import("@/lib/moderation.server");

        const userId = await verifyBearerUser(request);
        if (!userId) {
          return new Response("Unauthorized", { status: 401, headers: CORS });
        }

        const parsed = inputSchema.safeParse(await request.json());
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400, headers: CORS });
        }

        const verdict = await reviewMedia(parsed.data, process.env["LOVABLE_API_KEY"]);
        return Response.json(verdict, { headers: CORS });
      },
    },
  },
});
