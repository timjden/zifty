import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist-pages",
    rollupOptions: {
      input: {
        privacy: "./firebase-pages/privacy-policy.html",
        termsOfService: "./firebase-pages/terms-of-service.html",
        signInWithPopup: "./firebase-pages/sign-in-with-popup.html",
      },
    },
  },
});
