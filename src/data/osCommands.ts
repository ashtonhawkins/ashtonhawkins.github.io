export type OsCommand = {
  id: string;
  title: string;
  description?: string;
  href: string;
  section: "Pages" | "Worlds" | "Activity" | "Highlights";
  keywords?: string[];
  featured?: boolean;
};

export const osCommands: OsCommand[] = [
  {
    id: "home",
    title: "Home",
    description: "Return to the console home",
    href: "/",
    section: "Pages",
    keywords: ["root", "start"],
    featured: true
  },
  {
    id: "about",
    title: "About",
    description: "Origin story, operating principles",
    href: "/about",
    section: "Pages",
    keywords: ["mission", "background", "operating system"],
    featured: true
  },
  {
    id: "now",
    title: "Now",
    description: "Current focus and cycles",
    href: "/now",
    section: "Pages",
    keywords: ["present", "focus", "cycles"],
    featured: true
  },
  {
    id: "resume",
    title: "Resume",
    description: "Career snapshots and roles",
    href: "/resume",
    section: "Pages",
    keywords: ["work", "experience", "cv"],
    featured: true
  },
  {
    id: "writing",
    title: "Writing",
    description: "Essays, notes, and thinking",
    href: "/writing",
    section: "Pages",
    keywords: ["essays", "notes"],
    featured: true
  },
  {
    id: "projects",
    title: "Projects",
    description: "Launches and experiments",
    href: "/projects",
    section: "Pages",
    keywords: ["builds", "products"],
    featured: true
  },
  {
    id: "press",
    title: "Press",
    description: "Interviews and features",
    href: "/press",
    section: "Pages",
    keywords: ["media", "quotes"],
    featured: false
  },
  {
    id: "activity",
    title: "Activity",
    description: "Recent motion and logs",
    href: "/activity",
    section: "Activity",
    keywords: ["updates", "movement", "log"],
    featured: true
  },
  {
    id: "world-travel",
    title: "Travel & itineraries",
    description: "Systems for moving fast and light",
    href: "/about#travel-+-itineraries",
    section: "Worlds",
    keywords: ["airports", "loyalty", "flights", "hotels"],
    featured: true
  },
  {
    id: "world-cycling",
    title: "Cycling & movement",
    description: "Mileage, cadence, and routes",
    href: "/about#cycling-+-movement",
    section: "Worlds",
    keywords: ["cycling", "movement", "training"],
    featured: true
  },
  {
    id: "world-recovery",
    title: "Recovery experiments",
    description: "Sleep, recovery, and systems",
    href: "/about#recovery-experiments",
    section: "Worlds",
    keywords: ["sleep", "oura", "rest"],
    featured: true
  },
  {
    id: "world-product",
    title: "Product & systems",
    description: "Designing tools and infrastructure",
    href: "/about#product-+-systems",
    section: "Worlds",
    keywords: ["product", "systems", "design"],
    featured: true
  },
  {
    id: "movement-recovery",
    title: "View Movement & recovery",
    description: "See movement stats and recovery index",
    href: "/activity",
    section: "Highlights",
    keywords: ["movement", "recovery", "stats"]
  },
  {
    id: "exploration-profile",
    title: "View Exploration profile",
    description: "Airports, routes, and decision rules",
    href: "/about#travel-+-itineraries",
    section: "Highlights",
    keywords: ["exploration", "travel", "opinions"]
  },
  {
    id: "experiments",
    title: "View Experiments shipped",
    description: "Tiny launches, weekly experiments",
    href: "/projects",
    section: "Highlights",
    keywords: ["experiments", "launches", "shipping"]
  }
];
