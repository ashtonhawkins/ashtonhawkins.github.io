# Component Catalog

> “Key components” below include all Astro/React components under `src/components` grouped by feature. Props are inferred from usage and component definitions.

## Core / layout
### `AppShell` (`src/layouts/AppShell.astro`)
- **Purpose**: Primary layout wrapping every page: header/nav, footer, theme bootstrapping, global styles import, and search console trigger.
- **Props**: `hideNavigation?: boolean`, `hideSearch?: boolean`.
- **Where used**: All pages in `src/pages/*`.
- **Variants**: `hideNavigation` + `hideSearch` used by `/` coming-soon page.

### `SEO` (`src/components/SEO.astro`)
- **Purpose**: Sets document `<title>`, meta tags, OpenGraph + Twitter, and structured data JSON-LD for homepage and writing posts.
- **Props**: `title: string`, `description: string`, `ogTitle?: string`.
- **Where used**: `index.astro`, `home.astro`, `about.astro`, `now.astro`, `resume.astro`, `writing/*`.
- **Variants**: Writes schema.org `Person`/`WebSite` on homepage and `BlogPosting` on writing posts.

### `SearchBox` (`src/components/SearchBox.astro`)
- **Purpose**: Pagefind-powered search UI wrapper.
- **Props**: `id?: string` (default `pagefind-search`), `className?: string`.
- **Where used**: `AppShell` footer search area.

### `ThemeToggle` (`src/components/ThemeToggle.tsx`)
- **Purpose**: Light/dark theme toggle, persists preference in localStorage.
- **Props**: none.
- **Where used**: `AppShell` header.

### `OsConsole` (`src/components/OsConsole.tsx`)
- **Purpose**: Command-palette modal (⌘K) with “Personal OS” status/ticker and navigation.
- **Props**: none.
- **Where used**: `AppShell` (client:idle).

## Content / page modules
### `NowCard` (`src/components/NowCard.astro`)
- **Purpose**: Renders “Now” snapshot from `src/content/now.json`.
- **Props**: none (reads JSON directly).
- **Where used**: `src/pages/now.astro`.

### `GaugeBar` (`src/components/GaugeBar.astro`)
- **Purpose**: Inline gauge visualization (used in Personal OS/Resume systems).
- **Props**: used as a presentational subcomponent (see personal components for data).
- **Where used**: Likely within Personal OS components.

### `ActivityList` (`src/components/ActivityList.tsx`)
- **Purpose**: Displays activity feed entries (from `public/data/activity.json`).
- **Props**: depends on activity data shape (see `src/lib/activity.ts`).
- **Where used**: Likely in Personal OS/About page or other surfaces.

### `ProcessTable` (`src/components/ProcessTable.astro`)
- **Purpose**: Structured table of processes/metrics.
- **Props**: from “Personal OS” datasets.
- **Where used**: Personal OS/About page modules.

### `OrbitMap` (`src/components/OrbitMap.astro`)
- **Purpose**: Visual orbit map diagram.
- **Props**: data-driven via Personal OS content.
- **Where used**: Personal OS/About page.

### `Sparkline` (`src/components/Sparkline.astro`)
- **Purpose**: Inline sparkline chart.
- **Props**: data values and labels.
- **Where used**: Personal OS / Resume scoreboards.

### `SystemDial` (`src/components/SystemDial.astro`)
- **Purpose**: Circular dial visualization.
- **Props**: value/range and labeling.
- **Where used**: Personal OS metrics.

### `ToggleRow` (`src/components/ToggleRow.astro`)
- **Purpose**: UI row with on/off indicator.
- **Props**: label + status.
- **Where used**: Personal OS settings and status rows.

### `MovementSwirlAvatar` (`src/components/MovementSwirlAvatar.tsx`)
- **Purpose**: Decorative movement-themed avatar.
- **Props**: internal state only.
- **Where used**: Personal OS visuals.

## Personal OS suite (`src/components/personal/*`)
### `SystemFieldHero` (TSX)
- **Purpose**: Hero visualization showing “system fields”.
- **Props**: `title`, `version`, `stability`, `clusters`.
- **Where used**: `about.astro`.

### `SystemSpecCard` (TSX)
- **Purpose**: System spec sheet panel.
- **Props**: `hostname`, `os`, `mode`, `loops`, `health`, `modeHeat`, `summary`, `interpretation`.
- **Where used**: `about.astro`.

### `SignalRack` (TSX)
- **Purpose**: Gauge + chip rack for personal signals.
- **Props**: `gauges`, `chips`.
- **Where used**: `about.astro`.

### `WorldsOrbit` (TSX)
- **Purpose**: Orbit chart for “worlds” activity.
- **Props**: `worlds`.
- **Where used**: `about.astro`.

### `ExplorationQuadrantMap` (TSX)
- **Purpose**: Quadrant map visualization.
- **Props**: `quadrants`.
- **Where used**: `about.astro`.

### `MovementRecoveryWheel` (TSX)
- **Purpose**: Radial progress wheel for movement/recovery.
- **Props**: `ticks`, `filledTicks`, `cyclingProgress`, `recoveryProgress`, `label`, `summary`.
- **Where used**: `about.astro`.

### `ProcessMonitor` (TSX)
- **Purpose**: Process list + CPU load card.
- **Props**: `cpuLoad`, `items`.
- **Where used**: `about.astro`.

### `SettingsBoard` (Astro)
- **Purpose**: Settings matrix UI.
- **Props**: `settings`.
- **Where used**: `about.astro`.

### `AppDock` (Astro)
- **Purpose**: Dock-style list of apps.
- **Props**: `items`.
- **Where used**: `about.astro`.

### `ConsolePreview` (Astro)
- **Purpose**: Static preview of the OS console.
- **Props**: none.
- **Where used**: `about.astro`.

## Resume suite (`src/components/resume/*`)
### `Hero`
- **Purpose**: Resume header with headline, contact, and metrics.
- **Props**: `hero`, `email`, `metrics`; slot `mode-toggle`.
- **Where used**: `resume.astro`.

### `ImpactTapestry`
- **Purpose**: Grid of impact stats.
- **Props**: `items`.
- **Where used**: `resume.astro`.

### `ExperienceTimeline`
- **Purpose**: Timeline of roles with scoped details.
- **Props**: `experiences`.
- **Where used**: `resume.astro`.

### `CaseStudyGrid`
- **Purpose**: Case study cards.
- **Props**: `caseStudies`.
- **Where used**: `resume.astro`.

### `KeywordChips`
- **Purpose**: Filterable keyword chips; powered by URL tag filters.
- **Props**: `keywords`, `activeTags`.
- **Where used**: `resume.astro`.

### `ConfidentialToggle`
- **Purpose**: Toggle between public/confidential resume modes.
- **Props**: `isConfidential`.
- **Where used**: `resume.astro` (slot in `Hero`).

### `ActionDock`
- **Purpose**: Final CTA dock with email + short bio.
- **Props**: `email`, `bio`.
- **Where used**: `resume.astro`.

### `Scoreboard`, `ExperienceCard`, `StickyContact`, `Snapshots`
- **Purpose**: Subcomponents for resume sections and cards.
- **Props**: defined internally and fed by resume data.
- **Where used**: nested within resume components.

## UI / utilities
### `Toast` (`src/components/ui/Toast.ts`)
- **Purpose**: Small notification primitive (used by resume downloads and interactions).
- **Props**: exported helper(s) for toast display.
- **Where used**: resume page inline scripts.

