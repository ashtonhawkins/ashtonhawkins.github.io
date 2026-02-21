const TRAKT_API_BASE_URL = 'https://api.trakt.tv';
const REQUEST_TIMEOUT_MS = 5_000;

interface TraktIds {
  trakt?: number;
  slug?: string;
  tmdb?: number;
}

interface TraktHistoryEntry {
  watched_at: string;
  show: {
    title: string;
    year: number | null;
    ids: TraktIds;
  };
  episode: {
    season: number;
    number: number;
    title: string;
  };
}

interface TraktShowDetails {
  runtime?: number;
  genres?: string[];
}

interface TraktPeopleResponse {
  cast?: Array<{
    person?: {
      name?: string;
    };
  }>;
}

export interface TraktTVEntry {
  watchedAt: string;
  title: string;
  year: number | null;
  season: number;
  episode: number;
  episodeTitle: string;
  runtime: number;
  genres: string[];
  cast: string[];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTrakt<T>(path: string, clientId: string): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(`${TRAKT_API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId
      }
    }, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      console.error(`[Nucleus] Trakt request failed for ${path}: ${response.status} ${response.statusText}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`[Nucleus] Trakt request errored for ${path}.`, error);
    return null;
  }
}

export async function fetchLatestTVShow(username?: string, clientId?: string): Promise<TraktTVEntry | null> {
  if (!username || !clientId) {
    return null;
  }

  const history = await fetchTrakt<TraktHistoryEntry[]>(`/users/${username}/history?type=episodes&limit=1`, clientId);
  const latest = history?.[0];

  if (!latest?.show || !latest.episode) {
    return null;
  }

  const showId = latest.show.ids.trakt ?? latest.show.ids.slug;
  let runtime = 0;
  let genres: string[] = [];
  let cast: string[] = [];

  if (showId !== undefined) {
    const details = await fetchTrakt<TraktShowDetails>(`/shows/${showId}?extended=full`, clientId);
    runtime = details?.runtime ?? 0;
    genres = details?.genres ?? [];

    const people = await fetchTrakt<TraktPeopleResponse>(`/shows/${showId}/people`, clientId);
    cast = (people?.cast ?? [])
      .map((entry) => entry.person?.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 5);
  }

  return {
    watchedAt: new Date(latest.watched_at).toISOString(),
    title: latest.show.title,
    year: latest.show.year,
    season: latest.episode.season,
    episode: latest.episode.number,
    episodeTitle: latest.episode.title,
    runtime,
    genres,
    cast
  };
}
