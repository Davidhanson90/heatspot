import { defineConfig } from "vite";

export default defineConfig({
  root: "harness",
  base: "./",
  server: {
    open: true
  },
  build: {
    outDir: "../harness-dist",
    emptyOutDir: true
  }
});
