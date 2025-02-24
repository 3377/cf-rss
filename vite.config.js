import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    target: "es2015",
  },
  css: {
    postcss: "./postcss.config.cjs",
  },
});
