# Cursor commissioning

## Purpose

Prove bounded local Cursor execution on `ashtonhawkins.com` without changing the site. This file is the only intended artifact of the first commissioning work order.

## Current branch

`ops/cursor-commissioning` (upstream recorded as `origin/main`).

## Control room vs execution

- ChatGPT is the control room: product, content, design, privacy, scope, acceptance criteria, and final review.
- Cursor is the execution layer: inspect, implement approved work orders, run local QA, and report evidence.
- Cursor must not invent or resolve product decisions. Unstated decisions go back to the control room as the smallest blocking question.

## Safety boundaries

- Never work on `main`. Never merge, deploy, change DNS/hosting/repository settings, rotate credentials, or alter secrets unless a work order authorizes that exact action.
- Never print, copy, commit, or expose credentials or local environment files.
- Do not inspect or change `src/data/` (including Oura and other personal feeds), `.env` files, credentials, or `_old/` unless a work order plus a ChatGPT privacy decision explicitly require it.
- Production site changes remain paused. This commissioning pass does not commit, push, merge, deploy, or open a PR.

## Local evidence (2026-08-26)

- Node (PATH pinned to `/opt/homebrew/opt/node@22/bin`): `v22.23.2`
- `ASTRO_TELEMETRY_DISABLED=1 npm run check`: exit `0` — 96 files, 0 errors, 0 warnings, 10 hints. Astro also logged that no files matched `src/content/links`.

## Pending

The first production-affecting work order remains pending PM / ChatGPT control-room decisions.
