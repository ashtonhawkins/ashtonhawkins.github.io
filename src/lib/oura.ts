/**
 * Oura Ring data loader for Astro components.
 *
 * Components should never import JSON files directly — always go through
 * this loader so data access is typed and centralized.
 */

import sleepData from '../data/oura/sleep.json';
import readinessData from '../data/oura/readiness.json';
import heartrateData from '../data/oura/heartrate.json';
import activityData from '../data/oura/activity.json';
import bodyData from '../data/oura/body.json';
import ringData from '../data/oura/ring.json';
import workoutsData from '../data/oura/workouts.json';

// ── Types ────────────────────────────────────────────────────────

export interface DailySleep {
  day: string;
  score: number | null;
  contributors?: {
    deep_sleep?: number | null;
    efficiency?: number | null;
    latency?: number | null;
    rem_sleep?: number | null;
    restfulness?: number | null;
    timing?: number | null;
    total_sleep?: number | null;
  } | null;
}

export interface SleepPeriod {
  day: string;
  bedtime_start: string | null;
  bedtime_end: string | null;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  light_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  awake_time: number | null;
  efficiency: number | null;
  lowest_heart_rate?: number | null;
  average_heart_rate?: number | null;
  average_hrv?: number | null;
  average_breath?: number | null;
  sleep_phase_5_min?: string | null;
  heart_rate?: {
    interval: number;
    items: (number | null)[];
    timestamp: string;
  } | null;
  hrv?: {
    interval: number;
    items: (number | null)[];
    timestamp: string;
  } | null;
  type?: string | null;
}

export interface SleepStage {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  durationMinutes: number;
}

export interface DailyReadiness {
  day: string;
  score: number | null;
  temperature_deviation?: number | null;
  temperature_trend_deviation?: number | null;
  contributors?: {
    activity_balance?: number | null;
    body_temperature?: number | null;
    hrv_balance?: number | null;
    previous_day_activity?: number | null;
    previous_night?: number | null;
    recovery_index?: number | null;
    resting_heart_rate?: number | null;
    sleep_balance?: number | null;
  } | null;
}

export interface DailyResilience {
  day: string;
  level?: string | null;
  contributors?: {
    sleep_recovery?: number | null;
    daytime_recovery?: number | null;
    stress?: number | null;
  } | null;
}

export interface HeartRateSample {
  bpm: number;
  source: string;
  timestamp: string;
}

export interface DailyActivity {
  day: string;
  score?: number | null;
  active_calories?: number | null;
  total_calories?: number | null;
  steps?: number | null;
  equivalent_walking_distance?: number | null;
  high_activity_met_minutes?: number | null;
  medium_activity_met_minutes?: number | null;
  low_activity_met_minutes?: number | null;
  sedentary_met_minutes?: number | null;
  inactivity_alerts?: number | null;
  target_calories?: number | null;
  target_meters?: number | null;
  met?: {
    interval: number;
    items: (number | null)[];
    timestamp: string;
  } | null;
  class_5_min?: string | null;
}

export interface DailySpo2 {
  day: string;
  spo2_percentage?: { average?: number | null } | null;
  breathing_disturbance_index?: number | null;
}

export interface DailyStress {
  day: string;
  stress_high?: number | null;
  recovery_high?: number | null;
  day_summary?: string | null;
}

export interface CardiovascularAge {
  day: string;
  vascular_age?: number | null;
}

export interface Vo2Max {
  day: string;
  vo2_max?: number | null;
}

export interface RingConfig {
  id?: string | null;
  color?: string | null;
  design?: string | null;
  firmware_version?: string | null;
  hardware_type?: string | null;
  set_up_at?: string | null;
  size?: number | null;
}

export interface Workout {
  day: string;
  activity?: string | null;
  calories?: number | null;
  distance?: number | null;
  duration?: number | null;
  intensity?: string | null;
  average_heart_rate?: number | null;
  source?: string | null;
}

export interface Session {
  day: string;
  type?: string | null;
  duration?: number | null;
  heart_rate?: {
    interval: number;
    items: (number | null)[];
  } | null;
  mood?: string | null;
}

export type TrendDirection = 'up' | 'down' | 'flat';

// ── Sleep ────────────────────────────────────────────────────────

export function getLatestSleep(): DailySleep | null {
  const daily = sleepData.daily as DailySleep[];
  if (!daily.length) return null;
  return daily[daily.length - 1];
}

export function getSleepHistory(days: number): DailySleep[] {
  const daily = sleepData.daily as DailySleep[];
  return daily.slice(-days);
}

export function getLatestSleepPeriod(): SleepPeriod | null {
  const periods = sleepData.periods as SleepPeriod[];
  if (!periods.length) return null;
  // Sort by bedtime_end descending and return the most recent
  const sorted = [...periods].sort(
    (a, b) =>
      new Date(b.bedtime_end ?? 0).getTime() - new Date(a.bedtime_end ?? 0).getTime()
  );
  return sorted[0];
}

export function getSleepPeriods(days: number): SleepPeriod[] {
  const periods = sleepData.periods as SleepPeriod[];
  return periods.slice(-days);
}

/**
 * Parses sleep_phase_5_min into stage durations for a given day.
 * Returns durations in minutes for each stage.
 * Encoding: 1=deep, 2=light, 3=REM, 4=awake
 */
export function getSleepStages(day?: string): SleepStage[] {
  const periods = sleepData.periods as SleepPeriod[];
  const period = day
    ? periods.find((p) => p.day === day)
    : [...periods].sort(
        (a, b) =>
          new Date(b.bedtime_end ?? 0).getTime() - new Date(a.bedtime_end ?? 0).getTime()
      )[0];

  if (!period?.sleep_phase_5_min) return [];

  const stageMap: Record<string, SleepStage['stage']> = {
    '1': 'deep',
    '2': 'light',
    '3': 'rem',
    '4': 'awake',
  };

  const counts: Record<string, number> = { deep: 0, light: 0, rem: 0, awake: 0 };

  for (const char of period.sleep_phase_5_min) {
    const stage = stageMap[char];
    if (stage) counts[stage] += 5;
  }

  return (Object.entries(counts) as [SleepStage['stage'], number][])
    .filter(([, mins]) => mins > 0)
    .map(([stage, durationMinutes]) => ({ stage, durationMinutes }));
}

/**
 * Averages sleep stage proportions over the last 14 days.
 * Returns durations in minutes for each stage, averaged.
 */
export function get14DayAverageSleepStages(): SleepStage[] {
  const periods = sleepData.periods as SleepPeriod[];
  const recent = periods.slice(-14).filter((p) => p.sleep_phase_5_min);

  if (!recent.length) return [];

  const totals: Record<string, number> = { deep: 0, light: 0, rem: 0, awake: 0 };
  const stageMap: Record<string, SleepStage['stage']> = {
    '1': 'deep',
    '2': 'light',
    '3': 'rem',
    '4': 'awake',
  };

  for (const period of recent) {
    for (const char of period.sleep_phase_5_min!) {
      const stage = stageMap[char];
      if (stage) totals[stage] += 5;
    }
  }

  const count = recent.length;
  return (Object.entries(totals) as [SleepStage['stage'], number][])
    .filter(([, mins]) => mins > 0)
    .map(([stage, totalMinutes]) => ({
      stage,
      durationMinutes: Math.round(totalMinutes / count),
    }));
}

// ── Readiness ────────────────────────────────────────────────────

export function getLatestReadiness(): DailyReadiness | null {
  const data = readinessData.readiness as DailyReadiness[];
  if (!data.length) return null;
  return data[data.length - 1];
}

export function getReadinessHistory(days: number): DailyReadiness[] {
  const data = readinessData.readiness as DailyReadiness[];
  return data.slice(-days);
}

export function getResilienceHistory(days: number): DailyResilience[] {
  const data = readinessData.resilience as DailyResilience[];
  return data.slice(-days);
}

// ── Heart Rate ───────────────────────────────────────────────────

export function getHeartRateHistory(days: number): HeartRateSample[] {
  const data = heartrateData.data as HeartRateSample[];
  if (!days || !data.length) return data;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTime = cutoff.getTime();

  return data.filter((s) => new Date(s.timestamp).getTime() >= cutoffTime);
}

// ── Activity ─────────────────────────────────────────────────────

export function getLatestActivity(): DailyActivity | null {
  const data = activityData.data as DailyActivity[];
  if (!data.length) return null;
  return data[data.length - 1];
}

export function getActivityHistory(days: number): DailyActivity[] {
  const data = activityData.data as DailyActivity[];
  return data.slice(-days);
}

// ── Body Metrics ─────────────────────────────────────────────────

export function getBodyMetrics(): {
  spo2: DailySpo2[];
  stress: DailyStress[];
  cardiovascular_age: CardiovascularAge[];
  vo2_max: Vo2Max[];
} {
  return {
    spo2: bodyData.spo2 as DailySpo2[],
    stress: bodyData.stress as DailyStress[],
    cardiovascular_age: bodyData.cardiovascular_age as CardiovascularAge[],
    vo2_max: bodyData.vo2_max as Vo2Max[],
  };
}

// ── Ring Config ──────────────────────────────────────────────────

export function getRingConfig(): RingConfig | null {
  const data = ringData.data as RingConfig[];
  if (!data.length) return null;
  return data[0];
}

// ── Workouts & Sessions ──────────────────────────────────────────

export function getWorkoutHistory(days: number): Workout[] {
  const data = workoutsData.workouts as Workout[];
  return data.slice(-days);
}

export function getSessionHistory(days: number): Session[] {
  const data = workoutsData.sessions as Session[];
  return data.slice(-days);
}

// ── Computed Helpers ─────────────────────────────────────────────

/**
 * Returns the trend direction for a given metric over the specified number
 * of days. Compares the average of the most recent half against the earlier half.
 *
 * Supported metrics: sleepScore, readinessScore, hrv, restingHR, steps, spo2
 */
export function getMetricTrend(
  metric: 'sleepScore' | 'readinessScore' | 'hrv' | 'restingHR' | 'steps' | 'spo2',
  days: number
): TrendDirection {
  let values: number[] = [];

  switch (metric) {
    case 'sleepScore':
      values = getSleepHistory(days)
        .map((d) => d.score)
        .filter((v): v is number => v != null);
      break;
    case 'readinessScore':
      values = getReadinessHistory(days)
        .map((d) => d.score)
        .filter((v): v is number => v != null);
      break;
    case 'hrv': {
      const periods = getSleepPeriods(days);
      values = periods
        .map((p) => p.average_hrv)
        .filter((v): v is number => v != null);
      break;
    }
    case 'restingHR': {
      const periods = getSleepPeriods(days);
      values = periods
        .map((p) => p.lowest_heart_rate)
        .filter((v): v is number => v != null);
      break;
    }
    case 'steps':
      values = getActivityHistory(days)
        .map((d) => d.steps)
        .filter((v): v is number => v != null);
      break;
    case 'spo2':
      values = (bodyData.spo2 as DailySpo2[])
        .slice(-days)
        .map((d) => d.spo2_percentage?.average)
        .filter((v): v is number => v != null);
      break;
  }

  if (values.length < 4) return 'flat';

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const threshold = avgFirst * 0.03; // 3% change threshold
  if (avgSecond > avgFirst + threshold) return 'up';
  if (avgSecond < avgFirst - threshold) return 'down';
  return 'flat';
}

/**
 * Returns an array of date strings (YYYY-MM-DD) within the last N days
 * that have no sleep data recorded.
 */
export function getMissingDays(days: number): string[] {
  const daily = sleepData.daily as DailySleep[];
  const recordedDays = new Set(daily.map((d) => d.day));
  const missing: string[] = [];

  const now = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 86_400_000);
    const dateStr = date.toISOString().split('T')[0];
    if (!recordedDays.has(dateStr)) {
      missing.push(dateStr);
    }
  }

  return missing;
}
