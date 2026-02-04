# Critical Files Appendix

Only the files below are included verbatim because they define the rebuild-critical behavior, structure, and styling. Other files are summarized in the manifest.

## 1) `package.json` (build scripts, dependencies)
**Why critical**: Defines the framework/tooling versions and build commands.

```json
{
  "name": "ashtonhawkins.github.io",
  "version": "1.0.0",
  "description": "Astro v5 site for Ashton Hawkins",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "astro build",
    "dev": "astro dev",
    "preview": "astro preview --host",
    "format": "prettier --check .",
    "format:fix": "prettier --write .",
    "lint": "eslint . --ext .astro,.ts,.tsx,.js",
    "aggregate": "tsx scripts/aggregate.ts",
    "test": "tsx --test \"tests/**/*.test.ts\""
  },
  "dependencies": {
    "@astrojs/mdx": "^4.3.6",
    "@astrojs/react": "^4.4.0",
    "@astrojs/sitemap": "^3.6.0",
    "@astrojs/tailwind": "^6.0.2",
    "@fontsource/geist": "^5.2.8",
    "@fontsource/geist-mono": "^5.2.7",
    "@radix-ui/react-dialog": "^1.1.15",
    "@visx/scale": "^3.12.0",
    "astro": "^5.14.1",
    "astro-pagefind": "^1.8.5",
    "cmdk": "^1.1.1",
    "dayjs": "^1.11.18",
    "framer-motion": "^12.23.24",
    "lenis": "^1.3.11",
    "match-sorter": "^8.1.0",
    "motion": "^12.23.22",
    "pagefind": "^1.4.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "rss-parser": "^3.13.0",
    "undici": "^7.3.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.19",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@typescript-eslint/eslint-plugin": "^8.45.0",
    "@typescript-eslint/parser": "^8.45.0",
    "astro-eslint-parser": "^1.2.2",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.37.0",
    "eslint-plugin-astro": "^1.3.1",
    "eslint-plugin-react": "^7.37.5",
    "postcss": "^8.5.6",
    "prettier": "^3.6.2",
    "tailwindcss": "^3.4.17",
    "tsconfig-paths": "^4.2.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.45.0"
  }
}
```

## 2) `astro.config.ts` (framework configuration)
**Why critical**: Defines site URL, integrations, and a custom sitemap output fix.

```ts
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
```

## 3) `tailwind.config.mjs` (styling configuration)
**Why critical**: Maps design tokens into Tailwind utilities and defines typography/spacing scale.

```js
import defaultTheme from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,mjs,ts,tsx}",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        overlay: "var(--surface-strong)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          strong: "var(--accent-strong)"
        },
        text: {
          primary: "var(--text-1)",
          secondary: "var(--text-2)",
          muted: "var(--muted)",
          inverted: "var(--text-inverted)"
        },
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono]
      },
      fontSize: {
        xs: ["clamp(0.78rem, 0.74rem + 0.12vw, 0.84rem)", { lineHeight: "1.6" }],
        sm: ["clamp(0.86rem, 0.8rem + 0.16vw, 0.94rem)", { lineHeight: "1.6" }],
        base: ["clamp(1rem, 0.94rem + 0.2vw, 1.08rem)", { lineHeight: "1.7" }],
        lg: ["clamp(1.125rem, 1.05rem + 0.25vw, 1.25rem)", { lineHeight: "1.55" }],
        xl: ["clamp(1.35rem, 1.2rem + 0.35vw, 1.6rem)", { lineHeight: "1.45" }],
        "2xl": ["clamp(1.6rem, 1.35rem + 0.6vw, 2rem)", { lineHeight: "1.35" }],
        "3xl": ["clamp(1.9rem, 1.55rem + 0.9vw, 2.5rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(2.25rem, 1.8rem + 1.2vw, 3.1rem)", { lineHeight: "1.1" }],
        "5xl": ["clamp(2.6rem, 2rem + 1.6vw, 3.75rem)", { lineHeight: "1.05" }]
      },
      boxShadow: {
        soft: "0 10px 40px -20px rgb(15 23 42 / 0.25)",
        ring: "inset 0 0 0 1px rgb(148 163 184 / 0.15)",
        overlay: "0 20px 60px -30px rgb(15 23 42 / 0.45)"
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "9999px"
      },
      spacing: {
        gutter: "clamp(1.25rem, 0.85rem + 1.2vw, 2.75rem)"
      },
      maxWidth: {
        prose: "65ch"
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            color: theme("colors.text.primary"),
            a: {
              color: theme("colors.accent.DEFAULT"),
              fontWeight: 600,
              textDecoration: "none",
              borderBottom: `1px solid ${theme("colors.accent.soft")}`,
              transition: "color 200ms ease, border 200ms ease",
              '&:hover': {
                color: theme("colors.accent.strong"),
                borderBottomColor: theme("colors.accent.strong")
              }
            },
            strong: { color: theme("colors.text.primary") },
            blockquote: {
              fontStyle: "normal",
              borderLeftColor: theme("colors.accent.soft"),
              color: theme("colors.text.secondary")
            },
            code: {
              fontFamily: theme("fontFamily.mono").join(", "),
              backgroundColor: theme("colors.surface"),
              padding: "0.125em 0.375em",
              borderRadius: theme("borderRadius.lg")
            }
          }
        },
        invert: {
          css: {
            color: theme("colors.text.inverted"),
            a: {
              color: theme("colors.accent.soft"),
              borderBottomColor: theme("colors.accent.soft"),
              '&:hover': {
                color: theme("colors.accent.DEFAULT"),
                borderBottomColor: theme("colors.accent.DEFAULT")
              }
            },
            blockquote: {
              borderLeftColor: theme("colors.accent.DEFAULT"),
              color: theme("colors.text.muted")
            }
          }
        }
      }),
      container: {
        center: true,
        padding: {
          DEFAULT: "clamp(1.25rem, 1rem + 1vw, 3rem)",
          lg: "clamp(2rem, 1.5rem + 1vw, 4rem)"
        },
        screens: {
          "2xl": "1200px"
        }
      }
    }
  },
  plugins: [typography]
};
```

## 4) `postcss.config.cjs` (styling pipeline)
**Why critical**: Enables Tailwind and Autoprefixer processing.

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

## 5) `src/styles/global.css` (global styles entry)
**Why critical**: Imports tokens/typography/effects and defines base view-transition and global rules.

```css
@import "./tokens.css";
@import "./typography.css";
@import "./effects.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
  background-color: var(--bg);
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg);
  color: var(--text-1);
}

a {
  transition: color 200ms ease, background-color 200ms ease;
}

main {
  flex: 1;
}

[data-theme="dark"] body,
html.dark body {
  background-color: var(--bg);
  color: var(--text-1);
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
}

@keyframes os-ticker-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-os-ticker {
  animation: os-ticker-scroll 34s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-os-ticker {
    animation: none;
  }
}
```

## 6) `src/layouts/AppShell.astro` (primary layout + nav/footer)
**Why critical**: Defines the header, nav links, footer, and theme initialization.

```astro
---
import "../styles/global.css";
import OsConsole from "../components/OsConsole";
import ThemeToggle from "../components/ThemeToggle";
import SearchBox from "../components/SearchBox.astro";
import lenisScript from "../scripts/lenis.ts?url";

interface Props {
  hideNavigation?: boolean;
  hideSearch?: boolean;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/resume", label: "Resume" },
  { href: "/now", label: "Now" },
  { href: "/writing", label: "Writing" }
];

const { hideNavigation = false, hideSearch = false } = Astro.props as Props;
---

<!DOCTYPE html>
<html lang="en" class="bg-background text-text-primary">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <slot name="head" />
    <script is:inline>
      const storedTheme = window.localStorage.getItem('site-theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const activeTheme = storedTheme ?? (systemPrefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', activeTheme === 'dark');
      document.documentElement.dataset.theme = activeTheme;
    </script>
  </head>
  <body class="min-h-screen bg-background text-text-primary">
    {!hideSearch && <OsConsole client:idle />}
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-ring"
    >
      Skip to content
    </a>
    <header class="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur">
      <div class="container flex items-center justify-between gap-6 py-4">
        <a
          href="/"
          class="font-semibold text-lg transition-colors hover:text-accent"
          data-astro-transition="animate"
        >
          Ashton Hawkins
        </a>
        {!hideNavigation && (
          <nav class="hidden items-center gap-2 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <a
                transition:animate
                href={link.href}
                class="rounded-full px-4 py-2 text-text-secondary transition-all hover:bg-accent-soft hover:text-text-primary"
                data-astro-transition="animate"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}
        <div class="flex items-center gap-2">
          {!hideSearch && (
            <button
              type="button"
              class="hidden rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary shadow-soft transition hover:border-accent hover:text-text-primary hover:shadow-ring md:inline-flex"
              data-command-button
            >
              <span class="hidden lg:inline">Console ·</span>
              <span class="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">⌘K</span>
            </button>
          )}
          <ThemeToggle client:idle />
        </div>
      </div>
    </header>
    <main id="main" class="container flex flex-col gap-16 py-12">
      <slot />
    </main>
    <footer class="border-t border-border/60 bg-background/90 py-10">
      <div class="container flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div class="max-w-md space-y-3">
          <p class="text-sm text-text-muted">
            Built with Astro, Tailwind, and a love for small, fast websites. View transitions are
            enabled—enjoy the smoothness.
          </p>
          <p class="text-xs text-text-muted">
            © {new Date().getFullYear()} Ashton Hawkins. All rights reserved.
          </p>
        </div>
        {!hideSearch && (
          <div class="w-full max-w-md space-y-4">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Search the site
            </h2>
            <SearchBox id="footer-search" />
          </div>
        )}
      </div>
    </footer>
    <script type="module" src={lenisScript}></script>
  </body>
</html>
```

## 7) `src/pages/index.astro` (home page template)
**Why critical**: The current root page and most visible entry point.

```astro
---
import AppShell from "../layouts/AppShell.astro";
import SEO from "../components/SEO.astro";

const currentYear = new Date().getFullYear();
---

<AppShell hideNavigation hideSearch>
  <SEO
    slot="head"
    title="Ashton Hawkins · Coming Soon"
    description="A new digital home for Ashton Hawkins is on the way."
    ogTitle="Ashton Hawkins"
  />
  <main class="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center">
    <span class="text-sm uppercase tracking-[0.3em] text-text-muted">Site update in progress</span>
    <h1 class="max-w-3xl text-balance text-4xl font-semibold leading-tight md:text-5xl">
      Something new is on the way.
    </h1>
    <p class="max-w-xl text-lg text-text-secondary">
      I’m crafting a refreshed space to share projects, process, and experiments. Check back soon for the
      full experience—or reach out if you’d like to collaborate in the meantime.
    </p>
    <a
      class="rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-text-primary transition hover:border-accent hover:bg-accent-soft hover:text-accent"
      href="mailto:hello@ashtonhawkins.com"
    >
      Say hello
    </a>
  </main>
  <footer class="pb-16 text-center text-xs text-text-muted">
    © {currentYear} Ashton Hawkins. All rights reserved.
  </footer>
</AppShell>
```

