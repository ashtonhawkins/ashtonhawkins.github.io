import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import _sodium from 'libsodium-wrappers';

/**
 * Populates src/data/strava/activities.json and src/data/cycling.json
 * with data from the Strava API V3.
 * Run with: npm run strava:fetch
 *
 * This script uses process.env (not import.meta.env) because it runs
 * outside of Vite/Astro via tsx.
 */

const TIMEOUT_MS = 15_000;
const BASE_URL = 'https://www.strava.com';
const API_BASE = `${BASE_URL}/api/v3`;
const STRAVA_DATA_DIR = resolve('src/data/strava');
const CYCLING_JSON_PATH = resolve('src/data/cycling.json');
const ROLLING_WINDOW_DAYS = 90;

const CYCLING_TYPES = new Set(['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide']);

const METERS_TO_MILES = 1 / 1609.34;
const METERS_TO_FEET = 3.28084;

// ── Helpers ──────────────────────────────────────────────────────

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function epochSecondsAgo(days: number): number {
  return Math.floor((Date.now() - days * 86_400_000) / 1000);
}

// ── GitHub Secret Update ─────────────────────────────────────────

async function updateGitHubSecret(secretName: string, secretValue: string): Promise<void> {
  await _sodium.ready;
  const sodium = _sodium;

  const repo = process.env.GITHUB_REPOSITORY;
  const ghPat = process.env.GH_PAT;

  if (!repo || !ghPat) {
    console.log('[strava] Warning: Cannot update GitHub secret — GH_PAT or GITHUB_REPOSITORY not set (running locally?)');
    return;
  }

  const keyRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/secrets/public-key`,
    { headers: { Authorization: `Bearer ${ghPat}`, Accept: 'application/vnd.github+json' } }
  );
  const { key, key_id } = await keyRes.json() as { key: string; key_id: string };

  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const binMsg = sodium.from_string(secretValue);
  const encrypted = sodium.crypto_box_seal(binMsg, binKey);
  const encryptedB64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);

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
    console.log(`[strava] Updated GitHub secret: ${secretName}`);
  } else {
    console.error(`[strava] Failed to update secret: ${res.status}`);
  }
}

// ── Token Refresh ────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Strava OAuth credentials. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REFRESH_TOKEN.'
    );
  }

  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
    signal: withTimeout(TIMEOUT_MS),
  });

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
    console.log('[strava] New refresh token received — persisting to GitHub Secrets...');
    try {
      await updateGitHubSecret('STRAVA_REFRESH_TOKEN', json.refresh_token);
    } catch (error) {
      console.warn(
        '[strava] Warning: Failed to persist new refresh token to GitHub Secrets:',
        error instanceof Error ? error.message : error
      );
      console.warn('[strava] Continuing with data fetch — token may need manual update.');
    }
  }

  return json.access_token;
}

// ── API Fetchers ─────────────────────────────────────────────────

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  map?: {
    id?: string;
    summary_polyline?: string;
    polyline?: string;
  };
  trainer?: boolean;
  commute?: boolean;
}

interface StravaStreamEntry {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

async function stravaGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: withTimeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[strava] ${path} returned ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(
      `[strava] ${path} failed:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ── Polyline Decoding & SVG Path ─────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function polylineToSvgPath(encoded: string): string {
  if (!encoded) return 'M10,80 C40,10 65,10 95,80 S150,150 180,80 C210,10 235,10 265,80';

  const points = decodePolyline(encoded);
  if (points.length < 2) return 'M10,80 L270,80';

  // viewBox is 0 0 280 160 — use padding
  const PAD = 10;
  const W = 280 - 2 * PAD;
  const H = 160 - 2 * PAD;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1e-5;
  const lngRange = maxLng - minLng || 1e-5;

  // Scale uniformly to preserve aspect ratio
  const scale = Math.min(W / lngRange, H / latRange);
  const scaledW = lngRange * scale;
  const scaledH = latRange * scale;
  const offsetX = PAD + (W - scaledW) / 2;
  const offsetY = PAD + (H - scaledH) / 2;

  const svgPoints = points.map(([lat, lng]) => {
    const x = ((lng - minLng) * scale + offsetX).toFixed(1);
    // Flip Y axis: higher lat = lower Y in SVG
    const y = ((maxLat - lat) * scale + offsetY).toFixed(1);
    return `${x},${y}`;
  });

  // Downsample to keep SVG path reasonable (max ~200 points)
  const maxPoints = 200;
  let sampled = svgPoints;
  if (svgPoints.length > maxPoints) {
    const step = svgPoints.length / maxPoints;
    sampled = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(svgPoints[Math.round(i * step)]);
    }
    // Always include the last point
    sampled.push(svgPoints[svgPoints.length - 1]);
  }

  return `M${sampled[0]} L${sampled.slice(1).join(' L')}`;
}

// ── Duration Formatting ──────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── ISO Week Helper ──────────────────────────────────────────────

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Get ISO week: find the Thursday of the week, then compute week number
  const day = d.getUTCDay() || 7; // Monday = 1, Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── Cycling Data Transform ───────────────────────────────────────

interface CyclingJson {
  thisMonth: { miles: number; elevation: number; rides: number };
  lastRide: { miles: number; elevation: number; duration: string };
  ytd: { miles: number };
  lastRouteTrace: string;
  weeklyMiles: number[];
  weeklyElevation: number[];
  goals: { monthlyMiles: number; monthlyElevation: number };
}

function buildCyclingJson(activities: StravaActivity[], lastRouteTrace: string): CyclingJson {
  const cyclingActivities = activities.filter((a) => CYCLING_TYPES.has(a.type));

  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  // thisMonth: current calendar month's cycling activities
  const thisMonthActivities = cyclingActivities.filter((a) => {
    const d = new Date(a.start_date_local || a.start_date);
    return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
  });

  const thisMonth = {
    miles: Math.round(thisMonthActivities.reduce((sum, a) => sum + a.distance * METERS_TO_MILES, 0)),
    elevation: Math.round(thisMonthActivities.reduce((sum, a) => sum + a.total_elevation_gain * METERS_TO_FEET, 0)),
    rides: thisMonthActivities.length,
  };

  // lastRide: most recent cycling activity
  const sortedCycling = [...cyclingActivities].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
  const latest = sortedCycling[0];
  const lastRide = latest
    ? {
        miles: Math.round(latest.distance * METERS_TO_MILES),
        elevation: Math.round(latest.total_elevation_gain * METERS_TO_FEET),
        duration: formatDuration(latest.moving_time),
      }
    : { miles: 0, elevation: 0, duration: '0:00:00' };

  // ytd: current year total cycling distance
  const ytdActivities = cyclingActivities.filter((a) => {
    const d = new Date(a.start_date_local || a.start_date);
    return d.getUTCFullYear() === currentYear;
  });
  const ytdMiles = Math.round(ytdActivities.reduce((sum, a) => sum + a.distance * METERS_TO_MILES, 0));

  // weeklyMiles / weeklyElevation: bucket by ISO week, 8 most recent
  const weekBuckets = new Map<string, { miles: number; elevation: number }>();
  for (const a of cyclingActivities) {
    const weekKey = getISOWeekKey(a.start_date_local || a.start_date);
    const bucket = weekBuckets.get(weekKey) ?? { miles: 0, elevation: 0 };
    bucket.miles += a.distance * METERS_TO_MILES;
    bucket.elevation += a.total_elevation_gain * METERS_TO_FEET;
    weekBuckets.set(weekKey, bucket);
  }

  const sortedWeeks = [...weekBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const recent8 = sortedWeeks.slice(-8);
  const weeklyMiles = recent8.map(([, b]) => Math.round(b.miles));
  const weeklyElevation = recent8.map(([, b]) => Math.round(b.elevation));

  // Pad to 8 entries if fewer weeks available
  while (weeklyMiles.length < 8) {
    weeklyMiles.unshift(0);
    weeklyElevation.unshift(0);
  }

  return {
    thisMonth,
    lastRide,
    ytd: { miles: ytdMiles },
    lastRouteTrace: lastRouteTrace,
    weeklyMiles,
    weeklyElevation,
    goals: { monthlyMiles: 200, monthlyElevation: 15000 },
  };
}

// ── Main ─────────────────────────────────────────────────────────

export async function main() {
  console.log('[strava] Fetching Strava data (90-day rolling window)...');

  let token: string;
  try {
    token = await refreshAccessToken();
  } catch (error) {
    console.error(
      '[strava] Auth failed:',
      error instanceof Error ? error.message : error
    );
    console.error('[strava] Skipping data fetch — cached JSON files will be preserved.');
    return;
  }

  await mkdir(STRAVA_DATA_DIR, { recursive: true });

  const afterEpoch = epochSecondsAgo(ROLLING_WINDOW_DAYS);
  const fetchedAt = new Date().toISOString();

  console.log(`[strava] Fetching activities after epoch ${afterEpoch} (${ROLLING_WINDOW_DAYS} days ago)`);

  // Fetch all activities (up to 200)
  const activities = await stravaGet<StravaActivity[]>(
    `/athlete/activities?per_page=200&after=${afterEpoch}`,
    token
  );

  if (!activities || activities.length === 0) {
    console.warn('[strava] No activities returned. Writing empty data files.');
    await Promise.all([
      writeFile(
        resolve(STRAVA_DATA_DIR, 'activities.json'),
        JSON.stringify({ fetched_at: fetchedAt, data: [] }, null, 2) + '\n',
        'utf8'
      ),
    ]);
    return;
  }

  console.log(`[strava] Fetched ${activities.length} activities`);

  // Write raw activities
  await writeFile(
    resolve(STRAVA_DATA_DIR, 'activities.json'),
    JSON.stringify({ fetched_at: fetchedAt, data: activities }, null, 2) + '\n',
    'utf8'
  );
  console.log(`[strava] Wrote ${resolve(STRAVA_DATA_DIR, 'activities.json')}`);

  // Find the most recent cycling activity for streams + route trace
  const cyclingActivities = activities
    .filter((a) => CYCLING_TYPES.has(a.type))
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  let lastRouteTrace = 'M10,80 C40,10 65,10 95,80 S150,150 180,80 C210,10 235,10 265,80';

  if (cyclingActivities.length > 0) {
    const latestCycling = cyclingActivities[0];
    console.log(`[strava] Most recent cycling activity: "${latestCycling.name}" (id: ${latestCycling.id})`);

    // Fetch streams for the most recent cycling activity
    const streams = await stravaGet<StravaStreamEntry[]>(
      `/activities/${latestCycling.id}/streams?keys=altitude,distance,grade_smooth&key_type=distance`,
      token
    );

    if (streams) {
      console.log(`[strava] Fetched streams for activity ${latestCycling.id}`);
    }

    // Build SVG path from the polyline
    const polyline = latestCycling.map?.summary_polyline ?? '';
    if (polyline) {
      lastRouteTrace = polylineToSvgPath(polyline);
      console.log(`[strava] Generated SVG route trace (${lastRouteTrace.length} chars)`);
    }
  } else {
    console.log('[strava] No cycling activities found — using fallback route trace');
  }

  // Build and write cycling.json
  const cyclingData = buildCyclingJson(activities, lastRouteTrace);
  await writeFile(CYCLING_JSON_PATH, JSON.stringify(cyclingData, null, 2) + '\n', 'utf8');
  console.log(`[strava] Wrote ${CYCLING_JSON_PATH}`);

  // Summary
  const typeCount = new Map<string, number>();
  for (const a of activities) {
    typeCount.set(a.type, (typeCount.get(a.type) ?? 0) + 1);
  }
  const typeSummary = [...typeCount.entries()].map(([t, c]) => `${t}: ${c}`).join(', ');
  console.log(`[strava] Done (${activities.length} activities — ${typeSummary})`);
  console.log(`[strava] Cycling this month: ${cyclingData.thisMonth.miles} mi, ${cyclingData.thisMonth.elevation} ft, ${cyclingData.thisMonth.rides} rides`);
  console.log(`[strava] YTD: ${cyclingData.ytd.miles} mi`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[strava] Unexpected error:', error);
    // Exit cleanly so cached JSON files are preserved and the build continues
  });
}
