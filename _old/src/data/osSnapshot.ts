export type OsSnapshot = {
  movementDaysPerMonth: number;
  movementCadencePercent: number;
  cyclingMilesYtd: number;
  cyclingGoalMilesYtd: number;
  averageSleepHours: number;
  recoveryIndexPercent: number;
  explorationIndexPercent: number;
  explorationDescription: string;
  experimentsShippedApprox: number;
};

export const osSnapshot: OsSnapshot = {
  movementDaysPerMonth: 22,
  movementCadencePercent: 73,
  cyclingMilesYtd: 420,
  cyclingGoalMilesYtd: 600,
  averageSleepHours: 7.4,
  recoveryIndexPercent: 76,
  explorationIndexPercent: 82,
  explorationDescription: "airport-opinionated; rainy coastal + sunny waterfronts + historic cores",
  experimentsShippedApprox: 52
};

export const cyclingSummary = `~${osSnapshot.cyclingMilesYtd} / ~${osSnapshot.cyclingGoalMilesYtd} mi`;
export const movementSummary = `~${osSnapshot.movementDaysPerMonth} movement days / typical month`;
export const sleepSummary = `about ${osSnapshot.averageSleepHours} hours most nights`;
export const recoverySummary = "recovery index in the mid-70s, steady habits";
export const explorationSummary = "rainy coastal + sunny waterfronts + historic cores + transit-rich metros";
export const experimentsSummary = `${osSnapshot.experimentsShippedApprox}+ experiments across ecommerce, UX, and systems`;
