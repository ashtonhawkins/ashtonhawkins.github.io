import stats from "./stats.json";
import worlds from "./worlds.json";
import placeCategories from "./placeCategories.json";

type World = (typeof worlds)[number];

type PlaceCategory = (typeof placeCategories)[number];

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export const statusTemplates = [
  `The current pattern: movement most days, sleep in the mid-${Math.round(stats.avgSleepHoursApprox)}s, and curiosity levels running high.`,
  `Recently: enough time in motion and on the bike that the wearables are mostly happy—hovering around ~${stats.rideMilesYTDApprox} miles so far.`,
  `In a typical month: ~${stats.movementDaysTypicalMonthApprox} days with meaningful movement and about ${stats.avgSleepHoursApprox.toFixed(1)} hours of sleep each night.`,
  `Right now: recovery trending steady, with rides inching toward ~${stats.rideGoalYTDApprox} miles and sleep landing in the mid-7s.`,
  `Lately: a healthy mix of movement, rest, and low-key exploration without tracking every detail.`,
];

export const heroDial = {
  centerTitle: "Personal OS",
  centerSubtitle: "v1.x · stable",
  rings: [
    {
      label: "Movement",
      value: clamp(stats.rideMilesYTDApprox / stats.rideGoalYTDApprox),
      goal: 1,
      colorClass: "text-primary",
      hint: `~${stats.rideMilesYTDApprox} / ~${stats.rideGoalYTDApprox} mi`,
    },
    {
      label: "Exploration",
      value: clamp(stats.explorationIndex),
      goal: 1,
      colorClass: "text-secondary",
      hint: "airport-opinionated",
    },
    {
      label: "Recovery",
      value: clamp(stats.recoveryIndex),
      goal: 1,
      colorClass: "text-amber-400",
      hint: "~0.75 fullness",
    },
  ],
};

export const sensorReadings = [
  {
    label: "Movement days / typical month",
    description: "low 20s cadence and usually outside",
    current: stats.movementDaysTypicalMonthApprox,
    min: 0,
    max: 30,
    variant: "hero" as const,
  },
  {
    label: "Average nightly sleep",
    description: "about 7.4 hours most nights",
    current: stats.avgSleepHoursApprox,
    min: 6,
    max: 9,
    variant: "hero" as const,
  },
  {
    label: "Exploration index",
    description: "high enough for airport opinions",
    current: stats.explorationIndex,
    min: 0,
    max: 1,
    variant: "hero" as const,
  },
];

export const heroMetrics = [
  {
    title: "Miles ridden this year",
    value: `~${stats.rideMilesYTDApprox} mi`,
    detail: `Soft goal around ~${stats.rideGoalYTDApprox} mi.`,
    sparkline: [0.15, 0.22, 0.28, 0.32, 0.38, 0.45, 0.5, 0.62, 0.68, 0.7],
  },
  {
    title: "Experiments shipped (approx.)",
    value: `${stats.experimentsShippedApprox}+`,
    detail: "Tiny launches, UX tweaks, and system experiments included.",
    sparkline: [0.12, 0.16, 0.2, 0.3, 0.34, 0.4, 0.46, 0.55, 0.63, 0.7],
  },
];

export const explorationZones = placeCategories.map((zone: PlaceCategory) => ({
  ...zone,
  scaled: clamp(zone.intensity, 0, 1),
  descriptor:
    zone.intensity >= 0.8
      ? "~7–8"
      : zone.intensity >= 0.7
        ? "~7"
        : zone.intensity >= 0.6
          ? "~6"
          : "~5–6",
}));

export const orbitWorlds = (worlds as World[]).map((world, index) => ({
  ...world,
  intensity: [0.95, 0.85, 0.7, 0.8][index] ?? 0.75,
}));

export const movementRecovery = {
  gauges: [
    {
      label: "Cycling miles toward goal",
      description: `~${stats.rideMilesYTDApprox} of ~${stats.rideGoalYTDApprox} miles logged`,
      current: stats.rideMilesYTDApprox,
      min: 0,
      max: stats.rideGoalYTDApprox,
      variant: "subtle" as const,
    },
    {
      label: "Recovery index",
      description: "mid-70s% with steady habits",
      current: stats.recoveryIndex,
      min: 0,
      max: 1,
      variant: "subtle" as const,
    },
    {
      label: "Cadence & motion",
      description: `~${stats.movementDaysTypicalMonthApprox} movement days / typical month`,
      current: stats.movementDaysTypicalMonthApprox,
      min: 0,
      max: 30,
      variant: "subtle" as const,
    },
  ],
};

export const processes = {
  cpuLoad: 0.64,
  items: [
    { name: "Ecommerce flows & experiments", status: "steady", load: 0.72, lane: "active" as const },
    { name: "Cycling & movement routines", status: "green", load: 0.68, lane: "active" as const },
    { name: "Recovery experiments via wearables", status: "steady", load: 0.55, lane: "active" as const },
    { name: "Long-form writing", status: "idle", load: 0.24, lane: "queued" as const },
    { name: "New travel patterns", status: "warming up", load: 0.35, lane: "queued" as const },
    { name: "A hobby slot for whatever comes next", status: "idle", load: 0.18, lane: "queued" as const },
  ],
};

export const preferences = [
  {
    label: "Notification style",
    value: "Low drama",
    description: "Fewer pings, more ambient signals",
  },
  {
    label: "Work mode",
    value: "Async-friendly, deep work biased",
    description: "Clear priorities, low meeting load",
  },
  {
    label: "Planning horizon",
    value: "Weeks to months",
    description: "Enough structure without overfitting",
  },
  {
    label: "Tolerance for ambiguity",
    value: "High",
    description: "Cozy with unknowns and experiments",
  },
];

export const navDestinations = [
  { label: "Now", href: "/now", meta: "Live" },
  { label: "Writing", href: "/writing", meta: "Essays" },
];

export { stats, worlds };
