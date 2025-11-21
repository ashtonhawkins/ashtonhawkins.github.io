export type OsEventType = "movement" | "travel" | "experiment" | "recovery" | "work" | "other";

export type OsEvent = {
  id: string;
  displayTime: string;
  type: OsEventType;
  title: string;
  summary: string;
  href?: string;
};

export const osEvents: OsEvent[] = [
  {
    id: "ride-azalea-loop",
    displayTime: "Today",
    type: "movement",
    title: "Ride",
    summary: "24.3 mi coastal loop before breakfast"
  },
  {
    id: "experiment-cart",
    displayTime: "1d",
    type: "experiment",
    title: "Experiment",
    summary: "Remove Quick Buy cleared 244K visitors"
  },
  {
    id: "sleep-trend",
    displayTime: "2d",
    type: "recovery",
    title: "Recovery",
    summary: "Sleep trend steady at ~7.4 hours",
    href: "/about#recovery-experiments"
  },
  {
    id: "itinerary-lake",
    displayTime: "3d",
    type: "travel",
    title: "Flight",
    summary: "SEA → MCO for waterfront recon + rides",
    href: "/about#travel-+-itineraries"
  },
  {
    id: "movement-cadence",
    displayTime: "5d",
    type: "movement",
    title: "Movement",
    summary: "Cadence ~73% for the month"
  },
  {
    id: "experiment-fulfillment",
    displayTime: "6d",
    type: "work",
    title: "System",
    summary: "Fulfillment latency audit patched two vendors"
  },
  {
    id: "hotel-kissimmee",
    displayTime: "1w",
    type: "travel",
    title: "Hotel",
    summary: "Checked into Hampton Inn Kissimmee North"
  },
  {
    id: "recovery-index",
    displayTime: "1w",
    type: "recovery",
    title: "Recovery",
    summary: "Recovery index holding mid-70s",
    href: "/about#recovery-experiments"
  },
  {
    id: "experiment-systems",
    displayTime: "9d",
    type: "experiment",
    title: "Experiment",
    summary: "Navigation latency fix rolled to prod"
  },
  {
    id: "ride-bridge",
    displayTime: "2w",
    type: "movement",
    title: "Ride",
    summary: "Sunrise bridge repeat set, negative split"
  },
  {
    id: "profile-exploration",
    displayTime: "3w",
    type: "other",
    title: "Exploration",
    summary: "Airport opinions refreshed after back-to-back runs",
    href: "/about#travel-+-itineraries"
  },
  {
    id: "sleep-reset",
    displayTime: "3w",
    type: "recovery",
    title: "Recovery",
    summary: "Blue-light clamp reset bedtime drift",
    href: "/about#recovery-experiments"
  }
];
