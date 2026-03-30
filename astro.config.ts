import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: "https://reposweep.dev",
  integrations: [vue({ appEntrypoint: "/src/vue-app" })],
  vite: {
    plugins: [tailwindcss()],
  },
});
