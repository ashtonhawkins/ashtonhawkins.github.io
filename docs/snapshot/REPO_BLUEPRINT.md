# Repo Snapshot Blueprint

## “Rebuild in 1 week” overview
This site is an Astro v5 static site with file-based routing, Tailwind-based design tokens, and a mix of Astro, React, and MDX content. The rebuild path is: re-create the Astro project, mirror the content collections, rebuild the `AppShell` layout and page templates, then layer in the “Personal OS” and “Resume” component suites. The visual system is primarily driven by CSS variables (tokens) that Tailwind maps into utility classes.

## Stack / build / deploy
- **Framework**: Astro v5 with React integration (Astro components + React islands).
- **Styling**: Tailwind CSS (utility classes) + CSS variables for theme tokens.
- **Content**: Astro Content Collections (MDX + JSON) for writing/projects/press + JSON data files for personal/resume.
- **Search**: Pagefind (astro-pagefind) for on-site search UI.
- **Animation**: Motion/Framer Motion for interactive elements.
- **Package manager**: npm (package-lock.json tracked).
- **Node version**: GitHub Actions uses Node 20 for build/deploy.
- **Scripts** (from package.json):
  - `npm run dev` → Astro dev server
  - `npm run build` → Astro static build
  - `npm run preview` → Astro preview
  - `npm run aggregate` → fetch/aggregate activity data into `public/data/activity.json`
  - `npm run test` → tsx tests
  - `npm run lint` / `npm run format`

### Deploy / hosting
- **Hosting**: GitHub Pages.
- **CI**: GitHub Actions workflows build the Astro site and deploy to Pages. Two Pages workflows exist (one using `withastro/action`, another manually running `npm ci` + `npm run build`), plus an “aggregate activity” workflow that writes to `public/data/activity.json`.

## Route map (file-based)
Astro uses `src/pages` as the route root:
- `/` → `src/pages/index.astro` (coming soon landing)
- `/home` → `src/pages/home.astro` (full homepage / hero + latest writing)
- `/about` → `src/pages/about.astro` (Personal OS page)
- `/now` → `src/pages/now.astro` (Now page)
- `/resume` → `src/pages/resume.astro` (Resume)
- `/resume.json` → `src/pages/resume.json.ts` (data endpoint)
- `/writing` → `src/pages/writing/index.astro`
- `/writing/[slug]` → `src/pages/writing/[slug].astro`

## Layout map
- **Primary layout**: `src/layouts/AppShell.astro`
  - Owns `<html>`, theme bootstrapping, header/nav, footer, and search/console triggers.
  - Imports `src/styles/global.css`.
  - Provides main container structure and slot for page content.

## Component architecture & conventions
- **Feature folders**:
  - `src/components/personal/*`: “Personal OS” visual system (About page modules).
  - `src/components/resume/*`: Resume page sections and cards.
  - `src/components/ui/*`: reusable UI utilities (e.g., Toast).
- **Data-driven rendering**:
  - Most page components accept structured props from `src/data` or `src/content` JSON/MDX.
- **Islands**:
  - React components are loaded with `client:*` directives where needed (e.g., `client:visible`, `client:load`).

## Content sources
- **Astro Content Collections**: `src/content/config.ts`
  - `writing` (MDX)
  - `projects` (MDX)
  - `press` (MDX)
- **JSON content**:
  - `src/content/now.json` → Now page
  - `src/content/resume.json` → Resume page
- **Structured data files**:
  - `src/data/*.json` and `src/data/*.ts` drive personal/resume UI and command palette data.

