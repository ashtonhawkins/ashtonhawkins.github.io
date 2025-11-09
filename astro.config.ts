import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import pagefind from "astro-pagefind";

const ensureSitemapXml = {
  name: "ensure-sitemap-xml",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const outputDir = fileURLToPath(dir);
      const sitemapPartPath = path.join(outputDir, "sitemap-0.xml");
      const sitemapIndexPath = path.join(outputDir, "sitemap-index.xml");
      const sitemapPath = path.join(outputDir, "sitemap.xml");

      try {
        await fs.copyFile(sitemapPartPath, sitemapPath);
        logger.info("`sitemap.xml` created alongside default sitemap output.");
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            `Failed to create sitemap.xml: ${error instanceof Error ? error.message : String(error)}`
          );
          return;
        }
      }

      try {
        await fs.copyFile(sitemapIndexPath, sitemapPath);
        logger.info("`sitemap.xml` created from sitemap index output.");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          logger.error(
            `Failed to create sitemap.xml: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }
};

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
    sitemap(),
    ensureSitemapXml
  ],
  prefetch: {
    defaultStrategy: "viewport"
  }
});
