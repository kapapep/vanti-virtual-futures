// Native (Capacitor) build config — emits a fully static SPA (index.html + assets),
// no Nitro/Cloudflare server bundle. The web deployment keeps using vite.config.ts.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html", crawlLinks: false },
    },
  },
});
