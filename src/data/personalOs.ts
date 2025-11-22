import stats from "./stats.json";
import worlds from "./worlds.json";
import placeCategories from "./placeCategories.json";

type World = (typeof worlds)[number];
type PlaceCategory = (typeof placeCategories)[number];

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

export const systemField = {
  title: "Personal OS",
  version: "v1.x",
  stability: "Stable",
  clusters: [
    {
      id: "movement",
      label: "Movement",
      value: clamp(stats.rideMilesYTDApprox / stats.rideGoalYTDApprox),
      detail: `~${stats.rideMilesYTDApprox} / ~${stats.rideGoalYTDApprox} mi`,
      description: "~70% toward the soft goal",
      color: "#7dd3fc",
    },
    {
      id: "exploration",
      label: "Exploration",
      value: clamp(stats.explorationIndex),
      detail: "airport-opinionated",
      description: "~82% curiosity intensity",
      color: "#c084fc",
    },
    {
      id: "recovery",
      label: "Recovery",
      value: clamp(stats.recoveryIndex),
      detail: "~0.75 fullness",
      description: "~76% recovery fullness",
      color: "#fbbf24",
    },
  ],
};

export const specSheet = {
  hostname: "ASHTON",
  os: "Personal OS v1.x",
  mode: "High curiosity · steady movement",
  loops: "Travel itineraries · cycling · recovery experiments · product systems",
  health: clamp(0.78, 0, 1),
  modeHeat: clamp(0.64, 0, 1),
};

export const signalRackConfig = {
  gauges: [
    {
      id: "movement-days",
      label: "Movement days / typical month",
      value: clamp(stats.movementDaysTypicalMonthApprox / 30),
      detail: `${stats.movementDaysTypicalMonthApprox}d rhythm`,
      description: "Tall gauge showing cadence",
    },
    {
      id: "sleep",
      label: "Average nightly sleep",
      value: clamp((stats.avgSleepHoursApprox - 6) / 3),
      detail: `${stats.avgSleepHoursApprox.toFixed(1)}h`,
      description: "Between 6–9 hours",
    },
    {
      id: "exploration-index",
      label: "Exploration index",
      value: clamp(stats.explorationIndex),
      detail: "82%",
      description: "Curiosity meter",
    },
  ],
  chips: [
    {
      id: "rides",
      label: "Miles ridden this year",
      value: stats.rideMilesYTDApprox,
      subtitle: `Soft goal ~${stats.rideGoalYTDApprox} mi`,
      sparkline: [0.1, 0.25, 0.35, 0.45, 0.48, 0.55, 0.62, 0.68, 0.72, 0.7],
    },
    {
      id: "experiments",
      label: "Experiments shipped",
      value: stats.experimentsShippedApprox,
      subtitle: "Tiny launches, UX tweaks, system experiments",
      sparkline: [0.08, 0.12, 0.22, 0.28, 0.33, 0.4, 0.52, 0.6, 0.66, 0.74],
    },
  ],
};

export const orbitWorlds = (worlds as World[]).map((world, index) => ({
  ...world,
  intensity: [0.95, 0.85, 0.7, 0.8][index] ?? 0.75,
}));

export const explorationQuadrants = (
  placeCategories as PlaceCategory[]
).map((zone, index) => ({
  ...zone,
  descriptor:
    index === 0
      ? "Rainy coastal"
      : index === 1
        ? "Sunny waterfront"
        : index === 2
          ? "Historic core"
          : "Transit-rich",
  percentage: Math.round(clamp(zone.intensity, 0, 1) * 100),
}));

export const movementRecoveryWheel = {
  ticks: 31,
  filledTicks: 22,
  cyclingProgress: clamp(stats.rideMilesYTDApprox / stats.rideGoalYTDApprox),
  recoveryProgress: clamp(stats.recoveryIndex),
  label: `~22 movement days / month · Recovery mid-70s%`,
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

export const settingsBoard = [
  {
    label: "Notification style",
    icon: "🔔",
    value: "Low drama",
    description: "Fewer pings, more ambient signals",
    tone: "Ambient",
  },
  {
    label: "Work mode",
    icon: "💻",
    value: "Async-friendly, deep work biased",
    description: "Clear priorities, low meeting load",
    tone: "Focus",
  },
  {
    label: "Planning horizon",
    icon: "🗺️",
    value: "Weeks to months",
    description: "Enough structure without overfitting",
    tone: "Steady",
  },
  {
    label: "Tolerance for ambiguity",
    icon: "🌫️",
    value: "High",
    description: "Cozy with unknowns and experiments",
    tone: "Playful",
  },
];

export const appDock = [
  { label: "Now", href: "/now", meta: "Live" },
  { label: "Writing", href: "/writing", meta: "Essays" },
];

export const statusTemplates = [
  `The current pattern: movement most days, sleep in the mid-${Math.round(stats.avgSleepHoursApprox)}s, and curiosity levels running high.`,
  `Recently: enough time in motion and on the bike that the wearables are mostly happy—hovering around ~${stats.rideMilesYTDApprox} miles so far.`,
  `In a typical month: ~${stats.movementDaysTypicalMonthApprox} days with meaningful movement and about ${stats.avgSleepHoursApprox.toFixed(1)} hours of sleep each night.`,
  `Right now: recovery trending steady, with rides inching toward ~${stats.rideGoalYTDApprox} miles and sleep landing in the mid-7s.`,
  `Lately: a healthy mix of movement, rest, and low-key exploration without tracking every detail.`,
];

export const heroBadge = {
  tags: ["Movement & routes", "Cycling", "Recovery experiments", "Product & systems"],
};
