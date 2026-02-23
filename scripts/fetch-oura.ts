import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import _sodium from 'libsodium-wrappers';

/**
 * Populates src/data/oura/*.json with data from the Oura Ring API V2.
 * Run with: npm run oura:fetch
 *
 * Writes 7 separate JSON files with a 90-day rolling window:
 *   sleep.json, readiness.json, heartrate.json, activity.json,
 *   body.json, ring.json, workouts.json
 *
 * This script uses process.env (not import.meta.env) because it runs
 * outside of Vite/Astro via tsx.
 *
 * IMPORTANT: Never fetch or store the personal_info endpoint.
 */

const TIMEOUT_MS = 15_000;
const BASE_URL = 'https://api.ouraring.com';
const DATA_DIR = resolve('src/data/oura');
const CACHE_PATH = resolve('src/data/oura-cache.json');
const ROLLING_WINDOW_DAYS = 90;

// ── Helpers ──────────────────────────────────────────────────────

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDatetime(date: Date): string {
  return date.toISOString();
}

function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = formatDate(now);
  const start = new Date(now.getTime() - ROLLING_WINDOW_DAYS * 86_400_000);
  const startDate = formatDate(start);
  return { startDate, endDate };
}

// ── GitHub Secret Update ─────────────────────────────────────────

async function updateGitHubSecret(secretName: string, secretValue: string): Promise<void> {
  await _sodium.ready;
  const sodium = _sodium;

  const repo = process.env.GITHUB_REPOSITORY;
  const ghPat = process.env.GH_PAT;

  if (!repo || !ghPat) {
    console.log('[oura] Warning: Cannot update GitHub secret — GH_PAT or GITHUB_REPOSITORY not set (running locally?)');
    return;
  }

  // Step 1: Get the repo's public key for secret encryption
  const keyRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/secrets/public-key`,
    { headers: { Authorization: `Bearer ${ghPat}`, Accept: 'application/vnd.github+json' } }
  );
  const { key, key_id } = await keyRes.json() as { key: string; key_id: string };

  // Step 2: Encrypt with libsodium sealed box
  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binMsg = sodium.from_string(secretValue);
  const encrypted = sodium.crypto_box_seal(binMsg, binKey);
  const encryptedB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);

  // Step 3: Update the secret
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/secrets/${secretName}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ghPat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ encrypted_value: encryptedB64, key_id }),
    }
  );

  if (res.status === 201 || res.status === 204) {
    console.log(`[oura] Updated GitHub secret: ${secretName}`);
  } else {
    console.error(`[oura] Failed to update secret: ${res.status}`);
  }
}

// ── Token Refresh ────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const refreshToken = process.env.OURA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Oura OAuth credentials. Set OURA_CLIENT_ID, OURA_CLIENT_SECRET, and OURA_REFRESH_TOKEN.'
    );
  }

  // Primary approach: Basic Auth header with credentials
  let response = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    signal: withTimeout(TIMEOUT_MS),
  });

  // Fallback: send all credentials in the body
  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`[oura] Basic Auth token refresh failed (${response.status}): ${errorText}`);
    console.warn('[oura] Retrying with credentials in request body...');

    response = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      signal: withTimeout(TIMEOUT_MS),
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!json.access_token) {
    throw new Error('Token refresh response missing access_token');
  }

  if (json.refresh_token && json.refresh_token !== refreshToken) {
    console.log('[oura] New refresh token received — persisting to GitHub Secrets...');
    try {
      await updateGitHubSecret('OURA_REFRESH_TOKEN', json.refresh_token);
    } catch (error) {
      console.warn(
        '[oura] Warning: Failed to persist new refresh token to GitHub Secrets:',
        error instanceof Error ? error.message : error
      );
      console.warn('[oura] Continuing with data fetch — token may need manual update.');
    }
  }

  return json.access_token;
}

async function getAccessToken(): Promise<string> {
  const directToken = process.env.OURA_ACCESS_TOKEN;
  if (directToken) return directToken;

  return refreshAccessToken();
}

// ── API Fetchers ─────────────────────────────────────────────────

async function ouraGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: withTimeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[oura] ${path} returned ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(
      `[oura] ${path} failed:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Fetches paginated data from an Oura API endpoint.
 * Some endpoints return { data: [...], next_token: "..." }.
 * This function follows all pages and concatenates the data arrays.
 */
async function fetchPaginated<T>(
  basePath: string,
  token: string
): Promise<T[]> {
  let allData: T[] = [];
  let nextToken: string | null = null;

  do {
    const separator = basePath.includes('?') ? '&' : '?';
    const fetchPath: string = nextToken
      ? `${basePath}${separator}next_token=${nextToken}`
      : basePath;

    const result: { data?: T[]; next_token?: string } | null =
      await ouraGet<{ data?: T[]; next_token?: string }>(fetchPath, token);

    if (!result) break;

    if (result.data) {
      allData = allData.concat(result.data);
    }

    nextToken = result.next_token ?? null;
  } while (nextToken);

  return allData;
}

/**
 * Fetches heartrate data in 7-day chunks to avoid response size issues.
 * 90 days of 5-min data is ~25,920 data points.
 * Uses start_datetime/end_datetime (ISO 8601 with time, not just date).
 */
async function fetchHeartRateChunked(
  token: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ bpm: number; source: string; timestamp: string }>> {
  const allData: Array<{ bpm: number; source: string; timestamp: string }> = [];
  const chunkMs = 7 * 86_400_000;
  let current = new Date(startDate);

  while (current < endDate) {
    const chunkEnd = new Date(
      Math.min(current.getTime() + chunkMs, endDate.getTime())
    );

    const path =
      `/v2/usercollection/heartrate?start_datetime=${formatDatetime(current)}` +
      `&end_datetime=${formatDatetime(chunkEnd)}`;

    const chunk = await fetchPaginated<{
      bpm: number;
      source: string;
      timestamp: string;
    }>(path, token);

    allData.push(...chunk);
    current = chunkEnd;
  }

  return allData;
}

// ── Data Structures ──────────────────────────────────────────────

interface OuraApiResponse<T> {
  data: T[];
  next_token?: string;
}

interface DailySleepEntry {
  day: string;
  score: number;
  contributors?: {
    deep_sleep?: number;
    efficiency?: number;
    latency?: number;
    rem_sleep?: number;
    restfulness?: number;
    timing?: number;
    total_sleep?: number;
  };
}

interface SleepPeriodEntry {
  day: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration: number;
  deep_sleep_duration: number;
  light_sleep_duration: number;
  rem_sleep_duration: number;
  awake_time: number;
  efficiency: number;
  lowest_heart_rate?: number;
  average_heart_rate?: number;
  average_hrv?: number;
  average_breath?: number;
  sleep_phase_5_min?: string;
  heart_rate?: {
    interval: number;
    items: (number | null)[];
    timestamp: string;
  };
  hrv?: {
    interval: number;
    items: (number | null)[];
    timestamp: string;
  };
  readiness?: {
    score?: number;
    temperature_deviation?: number;
    temperature_trend_deviation?: number;
    contributors?: Record<string, number | null>;
  };
  type?: string;
}

interface DailyReadinessEntry {
  day: string;
  score: number;
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  contributors?: {
    activity_balance?: number;
    body_temperature?: number;
    hrv_balance?: number;
    previous_day_activity?: number | null;
    previous_night?: number;
    recovery_index?: number;
    resting_heart_rate?: number;
    sleep_balance?: number;
  };
}

interface DailyResilienceEntry {
  day: string;
  level?: string;
  contributors?: {
    sleep_recovery?: number;
    daytime_recovery?: number;
    stress?: number;
  };
}

interface DailyActivityEntry {
  day: string;
  score?: number;
  active_calories?: number;
  total_calories?: number;
  steps?: number;
  equivalent_walking_distance?: number;
  high_activity_met_minutes?: number;
  medium_activity_met_minutes?: number;
  low_activity_met_minutes?: number;
  sedentary_met_minutes?: number;
  inactivity_alerts?: number;
  target_calories?: number;
  target_meters?: number;
  met?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  class_5_min?: string;
}

interface DailySpo2Entry {
  day: string;
  spo2_percentage?: { average?: number };
  breathing_disturbance_index?: number;
}

interface DailyStressEntry {
  day: string;
  stress_high?: number;
  recovery_high?: number;
  day_summary?: string;
}

interface CardiovascularAgeEntry {
  day: string;
  vascular_age?: number;
}

interface Vo2MaxEntry {
  day: string;
  vo2_max?: number;
}

interface RingConfigEntry {
  id?: string;
  color?: string;
  design?: string;
  firmware_version?: string;
  hardware_type?: string;
  set_up_at?: string;
  size?: number;
}

interface WorkoutEntry {
  day: string;
  activity?: string;
  calories?: number;
  distance?: number;
  duration?: number;
  intensity?: string;
  average_heart_rate?: number;
  source?: string;
}

interface SessionEntry {
  day: string;
  type?: string;
  duration?: number;
  heart_rate?: {
    interval: number;
    items: (number | null)[];
  };
  mood?: string;
}

// ── File Writers ─────────────────────────────────────────────────

async function writeJson(filename: string, data: unknown): Promise<void> {
  const path = resolve(DATA_DIR, filename);
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[oura] Wrote ${path}`);
}

// ── Cache Generation ─────────────────────────────────────────────

interface CacheSleepStage {
  stage: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Reads the raw JSON files from src/data/oura/ and generates
 * src/data/oura-cache.json in the shape the frontend components expect.
 */
async function generateOuraCache(fetchedAt: string): Promise<void> {
  console.log('[oura] Generating oura-cache.json...');

  // Read raw data files
  const [sleepRaw, readinessRaw, bodyRaw] = await Promise.all([
    readFile(resolve(DATA_DIR, 'sleep.json'), 'utf8'),
    readFile(resolve(DATA_DIR, 'readiness.json'), 'utf8'),
    readFile(resolve(DATA_DIR, 'body.json'), 'utf8'),
  ]);

  const sleep = JSON.parse(sleepRaw) as {
    daily: DailySleepEntry[];
    periods: SleepPeriodEntry[];
  };
  const readiness = JSON.parse(readinessRaw) as {
    readiness: DailyReadinessEntry[];
  };
  const body = JSON.parse(bodyRaw) as {
    spo2: DailySpo2Entry[];
    stress: DailyStressEntry[];
  };

  const dailySleep = sleep.daily ?? [];
  const periods = sleep.periods ?? [];
  const dailyReadiness = readiness.readiness ?? [];
  const spo2Data = body.spo2 ?? [];
  const stressData = body.stress ?? [];

  // Find most recent long_sleep period (sorted by bedtime_end descending)
  const longSleepPeriods = periods
    .filter((p) => p.type === 'long_sleep')
    .sort((a, b) => new Date(b.bedtime_end).getTime() - new Date(a.bedtime_end).getTime());
  const latestPeriod = longSleepPeriods[0] ?? null;

  // Most recent daily sleep entry
  const latestDailySleep = dailySleep.length > 0 ? dailySleep[dailySleep.length - 1] : null;

  // Most recent daily readiness entry
  const latestReadiness = dailyReadiness.length > 0 ? dailyReadiness[dailyReadiness.length - 1] : null;

  // Most recent spo2
  const latestSpo2 = spo2Data.length > 0 ? spo2Data[spo2Data.length - 1] : null;

  // Most recent stress
  const latestStress = stressData.length > 0 ? stressData[stressData.length - 1] : null;

  // Determine the last night date
  const lastNightDate = latestDailySleep?.day ?? latestPeriod?.day ?? '';

  // Map stress day_summary to the stressLevel format components expect
  function mapStressLevel(summary: string | undefined): string {
    if (!summary) return 'normal';
    const s = summary.toLowerCase();
    if (s === 'restored') return 'restored';
    if (s === 'normal') return 'normal';
    if (s === 'stressed' || s === 'stressful') return 'stressed';
    if (s === 'high') return 'high';
    return 'normal';
  }

  // Build lastNight object
  const lastNight = {
    sleepScore: latestDailySleep?.score ?? 0,
    readinessScore: latestReadiness?.score ?? 0,
    totalSleepMinutes: latestPeriod ? Math.round(latestPeriod.total_sleep_duration / 60) : 0,
    remMinutes: latestPeriod ? Math.round(latestPeriod.rem_sleep_duration / 60) : 0,
    deepMinutes: latestPeriod ? Math.round(latestPeriod.deep_sleep_duration / 60) : 0,
    lightMinutes: latestPeriod ? Math.round(latestPeriod.light_sleep_duration / 60) : 0,
    awakeMinutes: latestPeriod ? Math.round(latestPeriod.awake_time / 60) : 0,
    sleepEfficiency: latestPeriod?.efficiency ?? 0,
    restingHeartRate: latestPeriod?.lowest_heart_rate ?? 0,
    hrv: latestPeriod?.average_hrv ?? 0,
    spo2: latestSpo2?.spo2_percentage?.average ?? 0,
    respiratoryRate: latestPeriod?.average_breath ?? 0,
    bodyTempDeviation: latestPeriod?.readiness?.temperature_deviation
      ?? latestReadiness?.temperature_deviation ?? 0,
    stressLevel: mapStressLevel(latestStress?.day_summary),
    bedtimeStart: latestPeriod?.bedtime_start ?? null,
    bedtimeEnd: latestPeriod?.bedtime_end ?? null,
  };

  // Build 14-day trend arrays
  // Create lookup maps by day for each data source
  const sleepByDay = new Map(dailySleep.map((d) => [d.day, d]));
  const readinessByDay = new Map(dailyReadiness.map((d) => [d.day, d]));
  const spo2ByDay = new Map(spo2Data.map((d) => [d.day, d]));

  // For HRV, resting HR, and body temp, use the most recent long_sleep period per day
  const periodByDay = new Map<string, SleepPeriodEntry>();
  for (const p of periods) {
    if (p.type !== 'long_sleep') continue;
    const existing = periodByDay.get(p.day);
    if (!existing || new Date(p.bedtime_end).getTime() > new Date(existing.bedtime_end).getTime()) {
      periodByDay.set(p.day, p);
    }
  }

  // Generate date strings for the last 14 days (oldest first)
  const trendDays: string[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    trendDays.push(d.toISOString().split('T')[0]);
  }

  const weeklyTrend = {
    sleepScores: trendDays.map((day) => sleepByDay.get(day)?.score ?? null),
    readinessScores: trendDays.map((day) => readinessByDay.get(day)?.score ?? null),
    hrvValues: trendDays.map((day) => periodByDay.get(day)?.average_hrv ?? null),
    restingHR: trendDays.map((day) => periodByDay.get(day)?.lowest_heart_rate ?? null),
    bodyTemp: trendDays.map((day) => {
      const period = periodByDay.get(day);
      if (period?.readiness?.temperature_deviation != null) return period.readiness.temperature_deviation;
      const r = readinessByDay.get(day);
      return r?.temperature_deviation ?? null;
    }),
    spo2Values: trendDays.map((day) => spo2ByDay.get(day)?.spo2_percentage?.average ?? null),
  };

  // Build sleep stages from sleep_phase_5_min of the most recent period
  const sleepStages: CacheSleepStage[] = [];
  if (latestPeriod?.sleep_phase_5_min) {
    const phaseStr = latestPeriod.sleep_phase_5_min;
    const stageMap: Record<string, string> = {
      '1': 'deep',
      '2': 'light',
      '3': 'rem',
      '4': 'awake',
    };

    let currentStage = stageMap[phaseStr[0]] ?? 'awake';
    let startOffset = 0;

    for (let i = 1; i < phaseStr.length; i++) {
      const stage = stageMap[phaseStr[i]] ?? 'awake';
      if (stage !== currentStage) {
        sleepStages.push({
          stage: currentStage,
          startOffset,
          endOffset: i * 5,
        });
        currentStage = stage;
        startOffset = i * 5;
      }
    }
    // Push the final segment
    sleepStages.push({
      stage: currentStage,
      startOffset,
      endOffset: phaseStr.length * 5,
    });
  }

  const cache = {
    lastFetched: fetchedAt,
    lastNightDate,
    lastNight,
    weeklyTrend,
    sleepStages,
  };

  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  console.log(`[oura] Wrote ${CACHE_PATH}`);
}

// ── Main ─────────────────────────────────────────────────────────

export async function main() {
  console.log('[oura] Fetching Oura Ring data (90-day rolling window)...');

  let token: string;
  try {
    token = await getAccessToken();
  } catch (error) {
    console.error(
      '[oura] Auth failed:',
      error instanceof Error ? error.message : error
    );
    console.error('[oura] Skipping data fetch — cached JSON files will be preserved.');
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });

  const { startDate, endDate } = getDateRange();
  const fetchedAt = new Date().toISOString();

  console.log(`[oura] Date range: ${startDate} to ${endDate}`);

  // Fetch all endpoints in parallel (except heartrate which is chunked)
  const [
    dailySleep,
    sleepPeriods,
    dailyReadiness,
    dailyResilience,
    dailyActivity,
    dailySpo2,
    dailyStress,
    cardiovascularAge,
    vo2Max,
    ringConfig,
    workoutsResult,
    sessionsResult,
  ] = await Promise.allSettled([
    ouraGet<OuraApiResponse<DailySleepEntry>>(
      `/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    fetchPaginated<SleepPeriodEntry>(
      `/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<DailyReadinessEntry>>(
      `/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<DailyResilienceEntry>>(
      `/v2/usercollection/daily_resilience?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<DailyActivityEntry>>(
      `/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<DailySpo2Entry>>(
      `/v2/usercollection/daily_spo2?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<DailyStressEntry>>(
      `/v2/usercollection/daily_stress?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<CardiovascularAgeEntry>>(
      `/v2/usercollection/daily_cardiovascular_age?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<Vo2MaxEntry>>(
      `/v2/usercollection/vo2_max?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    ouraGet<OuraApiResponse<RingConfigEntry>>(
      '/v2/usercollection/ring_configuration',
      token
    ),
    fetchPaginated<WorkoutEntry>(
      `/v2/usercollection/workout?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
    fetchPaginated<SessionEntry>(
      `/v2/usercollection/session?start_date=${startDate}&end_date=${endDate}`,
      token
    ),
  ]);

  // Fetch heartrate separately (chunked in 7-day windows)
  let heartrateData: Array<{ bpm: number; source: string; timestamp: string }> = [];
  try {
    const start = new Date();
    start.setTime(start.getTime() - ROLLING_WINDOW_DAYS * 86_400_000);
    heartrateData = await fetchHeartRateChunked(token, start, new Date());
    console.log(`[oura] heartrate: ${heartrateData.length} samples`);
  } catch (error) {
    console.error(
      '[oura] heartrate fetch failed:',
      error instanceof Error ? error.message : error
    );
  }

  // Helper to extract fulfilled values
  function fulfilled<T>(
    result: PromiseSettledResult<T>,
    label: string
  ): T | null {
    if (result.status === 'fulfilled') return result.value;
    console.error(`[oura] ${label} rejected:`, result.reason);
    return null;
  }

  const dailySleepData = fulfilled(dailySleep, 'daily_sleep');
  const sleepPeriodsData = fulfilled(sleepPeriods, 'sleep');
  const dailyReadinessData = fulfilled(dailyReadiness, 'daily_readiness');
  const dailyResilienceData = fulfilled(dailyResilience, 'daily_resilience');
  const dailyActivityData = fulfilled(dailyActivity, 'daily_activity');
  const dailySpo2Data = fulfilled(dailySpo2, 'daily_spo2');
  const dailyStressData = fulfilled(dailyStress, 'daily_stress');
  const cardiovascularAgeData = fulfilled(cardiovascularAge, 'cardiovascular_age');
  const vo2MaxData = fulfilled(vo2Max, 'vo2_max');
  const ringConfigData = fulfilled(ringConfig, 'ring_configuration');
  const workoutsData = fulfilled(workoutsResult, 'workout');
  const sessionsData = fulfilled(sessionsResult, 'session');

  // Write all 7 files in parallel
  await Promise.all([
    // File 1: sleep.json
    writeJson('sleep.json', {
      fetched_at: fetchedAt,
      daily: dailySleepData?.data ?? [],
      periods: sleepPeriodsData ?? [],
    }),

    // File 2: readiness.json
    writeJson('readiness.json', {
      fetched_at: fetchedAt,
      readiness: dailyReadinessData?.data ?? [],
      resilience: dailyResilienceData?.data ?? [],
    }),

    // File 3: heartrate.json
    writeJson('heartrate.json', {
      fetched_at: fetchedAt,
      data: heartrateData,
    }),

    // File 4: activity.json
    writeJson('activity.json', {
      fetched_at: fetchedAt,
      data: dailyActivityData?.data ?? [],
    }),

    // File 5: body.json
    writeJson('body.json', {
      fetched_at: fetchedAt,
      spo2: dailySpo2Data?.data ?? [],
      stress: dailyStressData?.data ?? [],
      cardiovascular_age: cardiovascularAgeData?.data ?? [],
      vo2_max: vo2MaxData?.data ?? [],
    }),

    // File 6: ring.json
    writeJson('ring.json', {
      fetched_at: fetchedAt,
      data: ringConfigData?.data ?? [],
    }),

    // File 7: workouts.json
    writeJson('workouts.json', {
      fetched_at: fetchedAt,
      workouts: workoutsData ?? [],
      sessions: sessionsData ?? [],
    }),
  ]);

  // Summary
  const counts = [
    `daily_sleep: ${(dailySleepData?.data ?? []).length}`,
    `sleep_periods: ${(sleepPeriodsData ?? []).length}`,
    `readiness: ${(dailyReadinessData?.data ?? []).length}`,
    `resilience: ${(dailyResilienceData?.data ?? []).length}`,
    `heartrate: ${heartrateData.length}`,
    `activity: ${(dailyActivityData?.data ?? []).length}`,
    `spo2: ${(dailySpo2Data?.data ?? []).length}`,
    `stress: ${(dailyStressData?.data ?? []).length}`,
    `cardiovascular_age: ${(cardiovascularAgeData?.data ?? []).length}`,
    `vo2_max: ${(vo2MaxData?.data ?? []).length}`,
    `ring: ${(ringConfigData?.data ?? []).length}`,
    `workouts: ${(workoutsData ?? []).length}`,
    `sessions: ${(sessionsData ?? []).length}`,
  ].join(', ');

  console.log(`[oura] Done (${counts})`);

  // Generate the derived cache file for frontend components
  try {
    await generateOuraCache(fetchedAt);
  } catch (error) {
    console.error(
      '[oura] Failed to generate oura-cache.json:',
      error instanceof Error ? error.message : error
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[oura] Unexpected error:', error);
    // Exit cleanly so cached JSON files are preserved and the build continues
  });
}
