import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  build: {
    target: "es2015",
    rollupOptions: {
      external: ["http", "https", "timers"],
    },
  },
  css: {
    postcss: "./postcss.config.cjs",
  },
  resolve: {
    alias: {
      http: "node:http",
      https: "node:https",
      timers: "node:timers",
    },
  },
  optimizeDeps: {
    include: ["rss-parser", "xml2js"],
  },
});
