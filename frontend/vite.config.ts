import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/app/",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
