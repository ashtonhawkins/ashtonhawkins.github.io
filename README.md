# ashtonhawkins.github.io

Astro 5 scaffold for a personal website deployed to GitHub Pages.

## Stack

- Astro 5 + TypeScript strict mode
- Tailwind CSS 4 using `@tailwindcss/vite`
- GSAP 3
- `@astrojs/sitemap`
- `astro-icon`

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

4. Preview production build:

   ```bash
   npm run preview
   ```

## Feed cache workflow

- Local run:

  ```bash
  npm run feeds:fetch
  ```

- GitHub Action `.github/workflows/feeds.yml` runs every 6 hours, updates `src/data/feeds-cache.json`, and pushes changes when needed.

## GitHub Pages deployment

- `.github/workflows/deploy.yml` builds and deploys the site when commits land on `main`.
- Repository Pages source should be set to **GitHub Actions**.
