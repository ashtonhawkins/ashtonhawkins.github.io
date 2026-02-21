import { fetchRetry } from './fetch-retry';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

interface StravaTokenResponse {
  access_token: string;
  refresh_token?: string;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  start_date: string;
  map?: {
    summary_polyline?: string;
  };
}

const CYCLING_ACTIVITY_TYPES = new Set(['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide']);

interface StravaStreamPoint {
  data?: number[];
}

interface StravaStreamsResponse {
  type: 'altitude' | 'distance' | 'grade_smooth';
  data: number[];
}

export interface CyclingRenderData {
  distanceMi: number;
  elevationFt: number;
  avgSpeedMph: number;
  maxGradientPct: number | null;
  avgHeartRate: number | null;
  elevationProfile: number[];
  distanceStream: number[];
  routePolyline: [number, number][];
  routeName: string;
}

export interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: CyclingRenderData;
}

export interface ActivityStreams {
  altitude: number[];
  distance: number[];
  grade: number[];
}

const getStravaCredentials = () => {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = import.meta.env;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    return null;
  }

  return {
    clientId: STRAVA_CLIENT_ID,
    clientSecret: STRAVA_CLIENT_SECRET,
    refreshToken: STRAVA_REFRESH_TOKEN
  };
};

export async function refreshStravaToken(): Promise<string | null> {
  const creds = getStravaCredentials();

  if (!creds) {
    console.error('[Nucleus] Missing Strava credentials. STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REFRESH_TOKEN must all be set.');
    return null;
  }

  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetchRetry(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Strava token refresh failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as StravaTokenResponse;
  if (!json.access_token) {
    throw new Error('Strava token refresh response missing access_token');
  }

  return json.access_token;
}

export async function getLatestActivity(accessToken: string): Promise<StravaActivity | null> {
  const response = await fetchRetry(`${STRAVA_API_BASE}/athlete/activities?per_page=10`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 403) {
      console.error(`[Nucleus] Strava returned 403. The refresh token likely needs activity:read scope. Re-auth at: https://www.strava.com/oauth/authorize?client_id=${import.meta.env.STRAVA_CLIENT_ID}&redirect_uri=http://localhost&response_type=code&scope=read,activity:read`);
    }
    throw new Error(`Failed fetching latest activity (${response.status}): ${text}`);
  }

  const activities = (await response.json()) as StravaActivity[];
  if (!activities.length) {
    console.error('[Nucleus] Strava returned 0 activities. The account may have no activities or the token scope may be insufficient.');
    return null;
  }

  const cycling = activities.find((activity) => CYCLING_ACTIVITY_TYPES.has(activity.type));
  if (!cycling) {
    console.error(`[Nucleus] No cycling activity in latest 10 Strava activities. Types found: ${activities.map((a) => a.type).join(', ')}`);
  }
  return cycling ?? null;
}

export async function getActivityStreams(accessToken: string, activityId: number): Promise<ActivityStreams | null> {
  try {
    const response = await fetchRetry(
      `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=altitude,distance,grade_smooth&key_type=distance`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed fetching activity streams (${response.status}): ${text}`);
    }

    const streams = (await response.json()) as StravaStreamsResponse[];
    const byType = streams.reduce<Record<string, StravaStreamPoint>>((acc, stream) => {
      acc[stream.type] = { data: stream.data };
      return acc;
    }, {});

    return {
      altitude: byType.altitude?.data ?? [],
      distance: byType.distance?.data ?? [],
      grade: byType.grade_smooth?.data ?? []
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Strava activity streams:', error);
    return null;
  }
}

export function decodePolyline(encoded: string): [number, number][] {
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

export async function fetchCyclingData(): Promise<SlideData | null> {
  try {
    const token = await refreshStravaToken();
    if (!token) {
      return null;
    }

    const activity = await getLatestActivity(token);
    if (!activity) {
      return null;
    }

    const streams = await getActivityStreams(token, activity.id);

    const distanceMi = (activity.distance / 1609.34).toFixed(1);
    const elevationFt = Math.round(activity.total_elevation_gain * 3.28084);
    const avgSpeedMph = (activity.average_speed * 2.237).toFixed(1);
    const maxGradient = streams?.grade.length ? Math.max(...streams.grade).toFixed(1) : null;

    return {
      label: 'CYCLING',
      detail: `${distanceMi} mi · ${elevationFt.toLocaleString()} ft · ${avgSpeedMph} mph`,
      link: '#cycling',
      updatedAt: activity.start_date,
      renderData: {
        distanceMi: Number.parseFloat(distanceMi),
        elevationFt,
        avgSpeedMph: Number.parseFloat(avgSpeedMph),
        maxGradientPct: maxGradient ? Number.parseFloat(maxGradient) : null,
        avgHeartRate: activity.average_heartrate ?? null,
        elevationProfile: streams?.altitude ?? [],
        distanceStream: streams?.distance ?? [],
        routePolyline: decodePolyline(activity.map?.summary_polyline ?? ''),
        routeName: activity.name
      }
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch cycling data:', error);
    return null;
  }
}
