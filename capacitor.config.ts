import type { CapacitorConfig } from "@capacitor/cli";

// The native shell loads the fully static SPA build:
//   bun run build:native  ->  dist/client (index.html + assets)
const config: CapacitorConfig = {
  appId: "app.lovable.vanti",
  appName: "Vanti",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    backgroundColor: "#000000",
  },
  android: {
    backgroundColor: "#000000",
  },
  plugins: {
    Keyboard: { resizeOnFullScreen: true },
  },
};

export default config;
