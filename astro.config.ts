import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [vue({ appEntrypoint: "/src/vue-app" })],
  vite: {
    plugins: [tailwindcss()],
  },
});