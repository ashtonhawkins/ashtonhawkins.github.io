import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Populates src/data/oura-cache.json with data from the Oura Ring API V2.
 * Run with: npm run oura:fetch
 *
 * This script uses process.env (not import.meta.env) because it runs
 * outside of Vite/Astro via tsx.
 */

const TIMEOUT_MS = 15_000;
const BASE_URL = 'https://api.ouraring.com';
const TARGET = resolve('src/data/oura-cache.json');

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateRange(): { today: string; twoWeeksAgo: string } {
  const now = new Date();
  const today = formatDate(now);
  const twoWeeksAgo = formatDate(new Date(now.getTime() - 14 * 86_400_000));
  return { today, twoWeeksAgo };
}

// ── Token Refresh ────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const refreshToken = process.env.OURA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const response = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      signal: withTimeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[oura] Token refresh returned ${response.status}`);
      return null;
    }

    const json = (await response.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch (error) {
    console.error('[oura] Token refresh failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
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
    console.error(`[oura] ${path} failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

interface OuraDailySleep {
  data: Array<{
    day: string;
    score: number;
    timestamp: string;
    contributors?: Record<string, number>;
  }>;
}

interface OuraDailyReadiness {
  data: Array<{
    day: string;
    score: number;
    timestamp: string;
    contributors?: Record<string, number>;
  }>;
}

interface OuraHeartRate {
  data: Array<{
    bpm: number;
    source: string;
    timestamp: string;
  }>;
}

interface OuraDailySpo2 {
  data: Array<{
    day: string;
    spo2_percentage?: { average?: number };
  }>;
}

interface OuraDailyStress {
  data: Array<{
    day: string;
    stress_high?: number;
    recovery_high?: number;
    day_summary?: string;
  }>;
}

interface OuraSleepSession {
  data: Array<{
    day: string;
    bedtime_start: string;
    bedtime_end: string;
    total_sleep_duration: number;
    rem_sleep_duration: number;
    deep_sleep_duration: number;
    light_sleep_duration: number;
    awake_time: number;
    efficiency: number;
    heart_rate?: { lowest?: number };
    hrv?: { mean_sdnn?: number };
    average_breath?: number;
    temperature_deviation?: number;
    sleep_phase_5_min?: string;
  }>;
}

// ── Data Processing ──────────────────────────────────────────────

function parseSleepStages(phaseData: string | undefined, totalMinutes: number): Array<{ stage: string; startOffset: number; endOffset: number }> {
  if (!phaseData) return [];

  const stageMap: Record<string, string> = {
    '1': 'deep',
    '2': 'light',
    '3': 'rem',
    '4': 'awake',
  };

  const stages: Array<{ stage: string; startOffset: number; endOffset: number }> = [];
  let currentStage = '';
  let startOffset = 0;

  for (let i = 0; i < phaseData.length; i++) {
    const stage = stageMap[phaseData[i]] || 'light';
    const offsetMinutes = i * 5;

    if (stage !== currentStage) {
      if (currentStage) {
        stages.push({ stage: currentStage, startOffset, endOffset: offsetMinutes });
      }
      currentStage = stage;
      startOffset = offsetMinutes;
    }
  }

  if (currentStage) {
    stages.push({ stage: currentStage, startOffset, endOffset: Math.min(phaseData.length * 5, totalMinutes) });
  }

  return stages;
}

function mapStressLevel(summary: string | undefined): string {
  if (!summary) return 'normal';
  const lower = summary.toLowerCase();
  if (lower.includes('restored') || lower.includes('recovery')) return 'restored';
  if (lower.includes('stressed') || lower.includes('high')) return 'stressed';
  if (lower.includes('high')) return 'high';
  return 'normal';
}

// ── Existing Cache ───────────────────────────────────────────────

interface OuraCache {
  lastFetched: string | null;
  lastNightDate: string | null;
  lastNight: {
    sleepScore: number;
    readinessScore: number;
    totalSleepMinutes: number;
    remMinutes: number;
    deepMinutes: number;
    lightMinutes: number;
    awakeMinutes: number;
    sleepEfficiency: number;
    restingHeartRate: number;
    hrv: number;
    spo2: number;
    respiratoryRate: number;
    bodyTempDeviation: number;
    stressLevel: string;
    bedtimeStart: string | null;
    bedtimeEnd: string | null;
  };
  weeklyTrend: {
    sleepScores: number[];
    readinessScores: number[];
    hrvValues: number[];
    restingHR: number[];
    bodyTemp: number[];
    spo2Values: number[];
  };
  sleepStages: Array<{ stage: string; startOffset: number; endOffset: number }>;
}

async function loadExistingCache(): Promise<OuraCache | null> {
  try {
    const raw = await readFile(TARGET, 'utf8');
    return JSON.parse(raw) as OuraCache;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────

export async function main() {
  console.log('[oura] Fetching Oura Ring data...');

  const token = await getAccessToken();
  if (!token) {
    console.log('[oura] No OURA_ACCESS_TOKEN (or refresh credentials) set, skipping');
    return;
  }

  const existing = await loadExistingCache();
  const { today, twoWeeksAgo } = getDateRange();

  const [dailySleep, dailyReadiness, heartRate, dailySpo2, dailyStress, sleepSessions] =
    await Promise.allSettled([
      ouraGet<OuraDailySleep>(`/v2/usercollection/daily_sleep?start_date=${twoWeeksAgo}&end_date=${today}`, token),
      ouraGet<OuraDailyReadiness>(`/v2/usercollection/daily_readiness?start_date=${twoWeeksAgo}&end_date=${today}`, token),
      ouraGet<OuraHeartRate>(`/v2/usercollection/heartrate?start_date=${today}&end_date=${today}`, token),
      ouraGet<OuraDailySpo2>(`/v2/usercollection/daily_spo2?start_date=${twoWeeksAgo}&end_date=${today}`, token),
      ouraGet<OuraDailyStress>(`/v2/usercollection/daily_stress?start_date=${twoWeeksAgo}&end_date=${today}`, token),
      ouraGet<OuraSleepSession>(`/v2/usercollection/sleep?start_date=${twoWeeksAgo}&end_date=${today}`, token),
    ]);

  const sleepData = dailySleep.status === 'fulfilled' ? dailySleep.value : null;
  const readinessData = dailyReadiness.status === 'fulfilled' ? dailyReadiness.value : null;
  const hrData = heartRate.status === 'fulfilled' ? heartRate.value : null;
  const spo2Data = dailySpo2.status === 'fulfilled' ? dailySpo2.value : null;
  const stressData = dailyStress.status === 'fulfilled' ? dailyStress.value : null;
  const sessionData = sleepSessions.status === 'fulfilled' ? sleepSessions.value : null;

  // Extract latest sleep session
  const latestSession = sessionData?.data?.sort(
    (a, b) => new Date(b.bedtime_end).getTime() - new Date(a.bedtime_end).getTime()
  )[0];

  // Extract 14-day arrays (last 14 entries, padded if needed)
  const sleepScores = (sleepData?.data || []).slice(-14).map((d) => d.score);
  const readinessScores = (readinessData?.data || []).slice(-14).map((d) => d.score);

  // Build resting HR from heart rate samples (use lowest from rest period)
  const restingSamples = (hrData?.data || [])
    .filter((s) => s.source === 'rest' || s.source === 'sleep')
    .map((s) => s.bpm);
  const restingHR = restingSamples.length ? Math.min(...restingSamples) : null;

  // Extract latest values
  const latestSleepScore = sleepScores[sleepScores.length - 1] ?? null;
  const latestReadiness = readinessScores[readinessScores.length - 1] ?? null;
  const latestSpo2 = spo2Data?.data?.slice(-1)[0]?.spo2_percentage?.average ?? null;
  const latestStress = stressData?.data?.slice(-1)[0];

  const totalSleepMinutes = latestSession
    ? Math.round(latestSession.total_sleep_duration / 60)
    : null;

  const payload: OuraCache = {
    lastFetched: new Date().toISOString(),
    lastNightDate: latestSession?.day ?? existing?.lastNightDate ?? null,
    lastNight: {
      sleepScore: latestSleepScore ?? existing?.lastNight?.sleepScore ?? 0,
      readinessScore: latestReadiness ?? existing?.lastNight?.readinessScore ?? 0,
      totalSleepMinutes: totalSleepMinutes ?? existing?.lastNight?.totalSleepMinutes ?? 0,
      remMinutes: latestSession ? Math.round(latestSession.rem_sleep_duration / 60) : existing?.lastNight?.remMinutes ?? 0,
      deepMinutes: latestSession ? Math.round(latestSession.deep_sleep_duration / 60) : existing?.lastNight?.deepMinutes ?? 0,
      lightMinutes: latestSession ? Math.round(latestSession.light_sleep_duration / 60) : existing?.lastNight?.lightMinutes ?? 0,
      awakeMinutes: latestSession ? Math.round(latestSession.awake_time / 60) : existing?.lastNight?.awakeMinutes ?? 0,
      sleepEfficiency: latestSession?.efficiency ?? existing?.lastNight?.sleepEfficiency ?? 0,
      restingHeartRate: restingHR ?? latestSession?.heart_rate?.lowest ?? existing?.lastNight?.restingHeartRate ?? 0,
      hrv: latestSession?.hrv?.mean_sdnn ? Math.round(latestSession.hrv.mean_sdnn) : existing?.lastNight?.hrv ?? 0,
      spo2: latestSpo2 ?? existing?.lastNight?.spo2 ?? 0,
      respiratoryRate: latestSession?.average_breath ?? existing?.lastNight?.respiratoryRate ?? 0,
      bodyTempDeviation: latestSession?.temperature_deviation ?? existing?.lastNight?.bodyTempDeviation ?? 0,
      stressLevel: mapStressLevel(latestStress?.day_summary) || existing?.lastNight?.stressLevel || 'normal',
      bedtimeStart: latestSession?.bedtime_start ?? existing?.lastNight?.bedtimeStart ?? null,
      bedtimeEnd: latestSession?.bedtime_end ?? existing?.lastNight?.bedtimeEnd ?? null,
    },
    weeklyTrend: {
      sleepScores: sleepScores.length >= 7 ? sleepScores : existing?.weeklyTrend?.sleepScores ?? [],
      readinessScores: readinessScores.length >= 7 ? readinessScores : existing?.weeklyTrend?.readinessScores ?? [],
      hrvValues: existing?.weeklyTrend?.hrvValues ?? [],
      restingHR: existing?.weeklyTrend?.restingHR ?? [],
      bodyTemp: existing?.weeklyTrend?.bodyTemp ?? [],
      spo2Values: existing?.weeklyTrend?.spo2Values ?? [],
    },
    sleepStages: latestSession
      ? parseSleepStages(latestSession.sleep_phase_5_min, totalSleepMinutes ?? 0)
      : existing?.sleepStages ?? [],
  };

  // Fill in HRV, resting HR, body temp, and SpO2 from sessions if available
  if (sessionData?.data && sessionData.data.length >= 7) {
    const sorted = sessionData.data
      .sort((a, b) => new Date(a.bedtime_end).getTime() - new Date(b.bedtime_end).getTime())
      .slice(-14);
    payload.weeklyTrend.hrvValues = sorted.map((s) => s.hrv?.mean_sdnn ? Math.round(s.hrv.mean_sdnn) : 0);
    payload.weeklyTrend.restingHR = sorted.map((s) => s.heart_rate?.lowest ?? 0);
    payload.weeklyTrend.bodyTemp = sorted.map((s) => s.temperature_deviation ?? 0);
  }

  // Fill in SpO2 from daily data if available
  const spo2Values = (spo2Data?.data || []).slice(-14).map((d) => d.spo2_percentage?.average ?? 0);
  if (spo2Values.length >= 7) {
    payload.weeklyTrend.spo2Values = spo2Values;
  }

  const counts = [
    `sleep: ${sleepScores.length}`,
    `readiness: ${readinessScores.length}`,
    `hr_samples: ${restingSamples.length}`,
    `sessions: ${sessionData?.data?.length ?? 0}`,
  ].join(', ');
  console.log(`[oura] Done (${counts})`);

  await writeFile(TARGET, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[oura] Wrote ${TARGET}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
