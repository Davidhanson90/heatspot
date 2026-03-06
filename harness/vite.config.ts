import { defineConfig } from "vite";

export default defineConfig({
  root: "harness",
  server: {
    open: true
  },
  build: {
    outDir: "../harness-dist",
    emptyOutDir: true
  }
});
