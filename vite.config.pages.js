import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-pages",
    rollupOptions: {
      input: {
        privacy: "pages/privacy-policy.html",
        signInWithPopup: "pages/sign-in-with-popup.html",
      },
    },
  },
});
