export type OsSnapshot = {
  movementDaysPerMonth: number;
  cyclingMilesYtd: number;
  cyclingGoalMilesYtd: number;
  averageSleepHours: number;
  recoveryIndex: number;
  explorationDescription: string;
  citiesRebookCount: number;
  experimentsShippedApprox: number;
};

export const osSnapshot: OsSnapshot = {
  movementDaysPerMonth: 22,
  cyclingMilesYtd: 420,
  cyclingGoalMilesYtd: 600,
  averageSleepHours: 7.4,
  recoveryIndex: 76,
  explorationDescription: "high enough for airport opinions",
  citiesRebookCount: 4,
  experimentsShippedApprox: 52
};

export type OsTickerItem = {
  id: string;
  label: string;
  primary: string;
  secondary?: string;
};

export const osTickerItems: OsTickerItem[] = [
  {
    id: "movement",
    label: "Movement",
    primary: `${osSnapshot.movementDaysPerMonth} days / month`,
    secondary: "steady"
  },
  {
    id: "cycling",
    label: "Cycling",
    primary: `~${osSnapshot.cyclingMilesYtd} mi YTD`,
    secondary: `goal ~${osSnapshot.cyclingGoalMilesYtd}`
  },
  {
    id: "sleep",
    label: "Sleep",
    primary: `${osSnapshot.averageSleepHours} hrs avg`,
    secondary: "most nights within target"
  },
  {
    id: "recovery",
    label: "Recovery",
    primary: `index ~${osSnapshot.recoveryIndex}%`,
    secondary: "baseline steady"
  },
  {
    id: "exploration",
    label: "Exploration",
    primary: osSnapshot.explorationDescription,
    secondary: `cities rebooked ${osSnapshot.citiesRebookCount}x`
  },
  {
    id: "experiments",
    label: "Experiments",
    primary: `${osSnapshot.experimentsShippedApprox}+ shipped`,
    secondary: "tiny launches included"
  }
];
