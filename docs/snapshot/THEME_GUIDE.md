# Theme Guide

## Design tokens
### Colors (CSS variables)
Defined in `src/styles/tokens.css` and referenced via Tailwind config.

**Light theme**
- Background: `--bg #f9fafb`
- Surface: `--surface #ffffff`
- Surface strong/overlay: `--surface-strong rgba(15, 23, 42, 0.08)`
- Text primary: `--text-1 #0f172a`
- Text secondary: `--text-2 #1f2937`
- Text inverted: `--text-inverted #f8fafc`
- Muted: `--muted #64748b`
- Border: `--border rgba(15, 23, 42, 0.12)`
- Accent: `--accent #2563eb`
- Accent soft: `--accent-soft rgba(37, 99, 235, 0.1)`
- Accent strong: `--accent-strong #1d4ed8`
- Success: `--success #16a34a`
- Warning: `--warning #f59e0b`
- Info: `--info #0ea5e9`

**Dark theme**
- Background: `--bg #05070f`
- Surface: `--surface rgba(15, 23, 42, 0.6)`
- Surface strong/overlay: `--surface-strong rgba(15, 23, 42, 0.8)`
- Text primary: `--text-1 #f8fafc`
- Text secondary: `--text-2 #cbd5f5`
- Text inverted: `--text-inverted #0f172a`
- Muted: `--muted #94a3b8`
- Border: `--border rgba(148, 163, 184, 0.35)`
- Accent: `--accent #60a5fa`
- Accent soft: `--accent-soft rgba(96, 165, 250, 0.18)`
- Accent strong: `--accent-strong #bfdbfe`
- Success: `--success #22c55e`
- Warning: `--warning #fbbf24`
- Info: `--info #38bdf8`

### Typography
- **Font families** (CSS variables):
  - Sans: `Geist`, fallbacks to Inter/SF Pro/Segoe UI
  - Mono: `Geist Mono`, fallbacks to SFMono/Menlo/etc.
- **Font sources**: `@fontsource/geist` and `@fontsource/geist-mono` imports in `src/styles/typography.css`.
- **Type scale (Tailwind)**:
  - `xs` → `clamp(0.78rem, 0.74rem + 0.12vw, 0.84rem)`
  - `sm` → `clamp(0.86rem, 0.8rem + 0.16vw, 0.94rem)`
  - `base` → `clamp(1rem, 0.94rem + 0.2vw, 1.08rem)`
  - `lg` → `clamp(1.125rem, 1.05rem + 0.25vw, 1.25rem)`
  - `xl` → `clamp(1.35rem, 1.2rem + 0.35vw, 1.6rem)`
  - `2xl` → `clamp(1.6rem, 1.35rem + 0.6vw, 2rem)`
  - `3xl` → `clamp(1.9rem, 1.55rem + 0.9vw, 2.5rem)`
  - `4xl` → `clamp(2.25rem, 1.8rem + 1.2vw, 3.1rem)`
  - `5xl` → `clamp(2.6rem, 2rem + 1.6vw, 3.75rem)`

### Spacing & layout
- **Container**: centered; `2xl` width is `1200px` with responsive padding.
- **Gutters**: `spacing.gutter = clamp(1.25rem, 0.85rem + 1.2vw, 2.75rem)`.
- **Radii**: `--radius-lg` 18px, `--radius-xl` 28px, `rounded-full` used frequently.
- **Shadows**:
  - `shadow-soft` → large soft shadow
  - `shadow-ring` → inset ring
  - `shadow-overlay` → deeper overlay shadow

### Breakpoints
- Tailwind default breakpoints apply; container is capped at 1200px on `2xl`.

## Styling implementation
- **Tokens** are defined as CSS variables in `src/styles/tokens.css` and mapped into Tailwind colors and radii in `tailwind.config.mjs`.
- **Global styles** live in `src/styles/global.css` and import `tokens.css`, `typography.css`, and `effects.css`.
- **Utility-first layout**: Most components use Tailwind utilities directly in markup.
- **Typography plugin**: `@tailwindcss/typography` customized for links, blockquotes, and code styles.

## UI patterns checklist (examples described)
- **Primary navigation**: sticky header with site name, pill-style nav links, and a theme toggle button.
- **Hero sections**: large headline + short subcopy + action buttons (rounded-full pills).
- **Card surfaces**: rounded-3xl panels with soft shadow and subtle borders for content sections.
- **Tag chips**: rounded-full badges with `bg-accent-soft` and accent text.
- **Search console**: command palette modal with keyboard shortcut (⌘K) and ticker UI.
- **Inline data modules**: resume scoreboard, impact tapestry, and case study cards use consistent border/rounded treatments.
- **Motion effects**: `bg-radial`, `bg-conic`, and `with-grain` utilities for subtle background texture.

