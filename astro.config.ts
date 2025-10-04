import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import pagefind from "astro-pagefind";

export default defineConfig({
  site: "https://ashtonhawkins.com",
  viewTransitions: true,
  integrations: [
    react(),
    mdx(),
    tailwind({
      config: { path: "./tailwind.config.mjs" }
    }),
    pagefind({
      ui: {
        resetStyles: false
      }
    }),
    sitemap()
  ],
  prefetch: {
    defaultStrategy: "viewport"
  }
});
