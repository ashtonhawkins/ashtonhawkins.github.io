const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const REQUEST_TIMEOUT_MS = 5000;

export const GENRE_BPM_MAP: Record<string, number> = {
  rock: 120,
  alternative: 118,
  indie: 115,
  pop: 116,
  electronic: 128,
  dance: 126,
  'hip-hop': 90,
  rap: 85,
  'r&b': 95,
  soul: 100,
  jazz: 110,
  classical: 80,
  folk: 105,
  country: 112,
  metal: 130,
  punk: 160,
  ambient: 70,
  'lo-fi': 85,
};

export interface LastFmRecentTrack {
  name: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  scrobbledAt: string;
  isNowPlaying: boolean;
}

export interface LastFmTrackInfo {
  duration: number;
  tags: string[];
  bpm?: number;
}

function getApiKey(): string | null {
  const apiKey = import.meta.env.PUBLIC_LASTFM_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0 ? apiKey.trim() : null;
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('PUBLIC_LASTFM_API_KEY is missing.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const query = new URLSearchParams({ ...params, api_key: apiKey, format: 'json' });
    const response = await fetch(`${LASTFM_API_BASE}?${query.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function estimateBpmFromGenre(genre: string): number {
  const normalized = genre.toLowerCase();
  for (const [key, bpm] of Object.entries(GENRE_BPM_MAP)) {
    if (normalized.includes(key)) return bpm;
  }
  return 110;
}

export async function getRecentTrack(username: string): Promise<LastFmRecentTrack | null> {
  if (!username?.trim()) {
    console.error('[Nucleus] Last.fm username is missing.');
    return null;
  }

  type RecentTrackResponse = {
    recenttracks?: {
      track?: Array<{
        name?: string;
        artist?: { '#text'?: string };
        album?: { '#text'?: string };
        image?: Array<{ '#text'?: string; size?: string }>;
        date?: { uts?: string };
        '@attr'?: { nowplaying?: string };
      }>;
    };
  };

  try {
    const data = await fetchJson<RecentTrackResponse>({
      method: 'user.getrecenttracks',
      user: username,
      limit: '1',
    });

    const track = data.recenttracks?.track?.[0];
    if (!track?.name || !track.artist?.['#text']) return null;

    const uts = track.date?.uts;
    const scrobbledAt = uts ? new Date(Number(uts) * 1000).toISOString() : '';

    return {
      name: track.name,
      artist: track.artist['#text'] ?? '',
      album: track.album?.['#text'] ?? '',
      albumArtUrl: track.image?.[3]?.['#text'] ?? '',
      scrobbledAt,
      isNowPlaying: track['@attr']?.nowplaying === 'true',
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm recent track:', error);
    return null;
  }
}

export async function getTrackInfo(artist: string, track: string): Promise<LastFmTrackInfo | null> {
  if (!artist || !track) return null;

  type TrackInfoResponse = {
    track?: {
      duration?: string;
      toptags?: {
        tag?: Array<{ name?: string }>;
      };
    };
  };

  try {
    const data = await fetchJson<TrackInfoResponse>({
      method: 'track.getInfo',
      artist,
      track,
    });

    const duration = Number(data.track?.duration ?? 0);
    const tags =
      data.track?.toptags?.tag
        ?.map((tag) => tag.name?.trim())
        .filter((name): name is string => Boolean(name)) ?? [];

    return {
      duration: Number.isFinite(duration) ? duration : 0,
      tags,
      bpm: tags[0] ? estimateBpmFromGenre(tags[0]) : undefined,
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm track info:', error);
    return null;
  }
}

export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  if (!imageUrl || typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        context.drawImage(image, 0, 0);

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        const stride = 16;
        for (let i = 0; i < data.length; i += 4 * stride) {
          const alpha = data[i + 3];
          if (alpha < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }

        if (count === 0) return resolve(null);

        const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
        resolve(`#${toHex(r / count)}${toHex(g / count)}${toHex(b / count)}`);
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
}
