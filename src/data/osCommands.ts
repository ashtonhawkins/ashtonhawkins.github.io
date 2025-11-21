import {
  cyclingSummary,
  experimentsSummary,
  explorationSummary,
  movementSummary,
  osSnapshot,
  recoverySummary
} from "./osSnapshot";

export type OsCommandSection = "Top" | "Worlds" | "Surfaces";

export type OsCommand = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  section: OsCommandSection;
  keywords?: string[];
  featured?: boolean;
};

export const osCommands: OsCommand[] = [
  {
    id: "movement-recovery",
    title: "View Movement & recovery",
    subtitle: `${cyclingSummary} · ${movementSummary} · ${recoverySummary}`,
    href: "/activity#movement",
    section: "Top",
    keywords: ["movement", "recovery", "cycling", "cadence"],
    featured: true
  },
  {
    id: "exploration-profile",
    title: "View Exploration profile",
    subtitle: explorationSummary,
    href: "/about#travel-+-itineraries",
    section: "Top",
    keywords: ["exploration", "travel", "airports", "metros"],
    featured: true
  },
  {
    id: "experiments",
    title: "View Experiments shipped",
    subtitle: experimentsSummary,
    href: "/projects",
    section: "Top",
    keywords: ["experiments", "launches", "shipping"],
    featured: true
  },
  {
    id: "world-travel",
    title: "Travel & itineraries",
    subtitle: "Routes, airports, hotels, and loyalty patterns",
    href: "/about#travel-+-itineraries",
    section: "Worlds",
    keywords: ["airports", "loyalty", "flights", "hotels"]
  },
  {
    id: "world-cycling",
    title: "Cycling & movement",
    subtitle: `Long-ish rides and regular movement; cadence ~${osSnapshot.movementCadencePercent}%`,
    href: "/about#cycling-+-movement",
    section: "Worlds",
    keywords: ["cycling", "movement", "training", "cadence"]
  },
  {
    id: "world-recovery",
    title: "Recovery experiments",
    subtitle: `Sleep ~${osSnapshot.averageSleepHours} hours; recovery in the mid-${osSnapshot.recoveryIndexPercent}s`,
    href: "/about#recovery-experiments",
    section: "Worlds",
    keywords: ["sleep", "oura", "rest", "recovery"]
  },
  {
    id: "world-product",
    title: "Product & systems",
    subtitle: "Flows, experiments, and the plumbing that keeps them running",
    href: "/about#product-+-systems",
    section: "Worlds",
    keywords: ["product", "systems", "design", "experiments"]
  },
  {
    id: "surface-home",
    title: "Home",
    subtitle: "Return to the Personal OS home",
    href: "/",
    section: "Surfaces",
    keywords: ["root", "start"]
  },
  {
    id: "surface-about",
    title: "About",
    subtitle: "Hostname, sensors, and story",
    href: "/about",
    section: "Surfaces",
    keywords: ["origin", "profile", "system"]
  },
  {
    id: "surface-now",
    title: "Now",
    subtitle: "Current loops and focus areas",
    href: "/now",
    section: "Surfaces",
    keywords: ["present", "focus", "cycles"]
  },
  {
    id: "surface-resume",
    title: "Resume",
    subtitle: "Roles, teams, and snapshots",
    href: "/resume",
    section: "Surfaces",
    keywords: ["work", "experience", "cv"]
  },
  {
    id: "surface-writing",
    title: "Writing",
    subtitle: "Essays, notes, and thinking",
    href: "/writing",
    section: "Surfaces",
    keywords: ["essays", "notes"]
  },
  {
    id: "surface-projects",
    title: "Projects",
    subtitle: "Launches and experiments",
    href: "/projects",
    section: "Surfaces",
    keywords: ["builds", "products"]
  },
  {
    id: "surface-press",
    title: "Press",
    subtitle: "Interviews and features",
    href: "/press",
    section: "Surfaces",
    keywords: ["media", "quotes"]
  },
  {
    id: "surface-activity",
    title: "Activity",
    subtitle: "Recent motion and logs",
    href: "/activity",
    section: "Surfaces",
    keywords: ["updates", "movement", "log"]
  }
];

export const osCommandSections: OsCommandSection[] = ["Top", "Worlds", "Surfaces"];
