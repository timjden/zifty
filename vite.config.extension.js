import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./browser-extension/manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: "dist-extension",
    rollupOptions: {
      input: {
        offscreen: "./browser-extension/offscreen/offscreen.html",
      },
    },
  },
});
