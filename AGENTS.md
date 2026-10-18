# ashtonhawkins.com agent instructions

## Operating model

- ChatGPT is the control room. Product strategy, content, design direction, privacy decisions, scope, acceptance criteria, and final review happen there with Ashton.
- Cursor is the execution layer. Cursor may inspect the repository, propose implementation plans, edit code for an approved work order, run terminal and browser QA, and prepare branches or pull requests.
- Do not invent or resolve product decisions. If a work order depends on an unstated decision, stop and identify the smallest question that must go back to the ChatGPT control room.

## Repository facts

- This repository is the canonical source for `ashtonhawkins.com`.
- The site is an Astro 5 static site using strict TypeScript, Tailwind CSS 4, GSAP, `@astrojs/sitemap`, and `astro-icon`.
- `main` is production-bearing and deploys through GitHub Actions to GitHub Pages. Cloudflare redirects the apex domain to `www`.
- `_old/` is archived legacy code. Do not use or modify it unless the work order explicitly calls for archaeology.
- Automated feed workflows update data files. Treat `src/data/oura/` and other personal feed data as sensitive even when currently present in the public repository.

## Safety boundaries

- Never work directly on `main`; use a purpose-specific branch or isolated Cursor worktree.
- Never merge, deploy, change DNS/hosting/repository settings, rotate credentials, or alter secrets unless the work order explicitly authorizes that exact action.
- Never print, copy, commit, or expose credentials or local environment files.
- Do not change or republish Oura or other personal data without an explicit privacy decision from the ChatGPT control room.
- Preserve unrelated user changes and generated feed updates. Do not commit `dist/`, `.astro/`, `node_modules/`, or local caches.
- Inspect before editing. Keep diffs narrow and reversible.

## Execution protocol

1. Read this file, `README.md`, `package.json`, and the relevant source files.
2. Check Git status and confirm the work is not occurring on `main`.
3. Restate the objective, constraints, acceptance criteria, and proposed plan before material edits.
4. Use Node 22, matching GitHub Actions. On this Mac, Node 22 is available at `/opt/homebrew/opt/node@22/bin`.
5. Install locked dependencies with `npm ci` when needed.
6. Validate code changes with `npm run check` and `npm run build`. For visual changes, also run the local preview and inspect affected pages in a browser.
7. Finish with a concise handoff: files changed, checks run and results, screenshots or artifacts, risks, open questions, and the branch or pull-request URL.

## Commissioning state

- Initial repository archaeology is complete.
- Production changes remain intentionally paused.
- Cursor commissioning may make documentation and local-tooling changes on `ops/cursor-commissioning`, but must not push, merge, or deploy without a specific instruction.
