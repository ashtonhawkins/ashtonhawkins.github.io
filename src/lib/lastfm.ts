import { fetchRetry } from './fetch-retry';

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

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
  loved?: boolean;
}

export interface LastFmTrackInfo {
  duration: number;
  tags: string[];
  bpm?: number;
  playCount?: number;
  userLoved?: boolean;
}

export interface LastFmTopArtist {
  name: string;
  playCount: number;
}

export interface LastFmUserInfo {
  playCount: number;
  registeredAt: string;
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

  const query = new URLSearchParams({ ...params, api_key: apiKey, format: 'json' });
  const response = await fetchRetry(`${LASTFM_API_BASE}?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
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
        loved?: string;
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
      loved: track.loved === '1',
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm recent track:', error);
    return null;
  }
}

export async function getRecentTracks(username: string, limit = 12): Promise<LastFmRecentTrack[]> {
  if (!username?.trim()) return [];

  type RecentTrackResponse = {
    recenttracks?: {
      track?: Array<{
        name?: string;
        artist?: { '#text'?: string };
        album?: { '#text'?: string };
        image?: Array<{ '#text'?: string; size?: string }>;
        date?: { uts?: string };
        loved?: string;
        '@attr'?: { nowplaying?: string };
      }>;
    };
  };

  try {
    const data = await fetchJson<RecentTrackResponse>({
      method: 'user.getrecenttracks',
      user: username,
      limit: String(clamp(limit, 1, 200)),
      extended: '1',
    });

    const tracks = data.recenttracks?.track ?? [];
    return tracks
      .filter((track) => Boolean(track?.name && track.artist?.['#text']))
      .map((track) => {
        const uts = track.date?.uts;
        const scrobbledAt = uts ? new Date(Number(uts) * 1000).toISOString() : '';
        return {
          name: track.name ?? '',
          artist: track.artist?.['#text'] ?? '',
          album: track.album?.['#text'] ?? '',
          albumArtUrl: track.image?.[2]?.['#text'] ?? track.image?.[3]?.['#text'] ?? '',
          scrobbledAt,
          isNowPlaying: track['@attr']?.nowplaying === 'true',
          loved: track.loved === '1',
        };
      });
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm recent tracks:', error);
    return [];
  }
}

export async function getTrackInfo(artist: string, track: string): Promise<LastFmTrackInfo | null> {
  if (!artist || !track) return null;

  type TrackInfoResponse = {
    track?: {
      duration?: string;
      userplaycount?: string;
      userloved?: string;
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
      playCount: Number.parseInt(data.track?.userplaycount ?? '0', 10) || 0,
      userLoved: data.track?.userloved === '1',
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm track info:', error);
    return null;
  }
}

export async function getUserTopArtists(username: string, period = '7day', limit = 5): Promise<LastFmTopArtist[]> {
  if (!username?.trim()) return [];

  type TopArtistsResponse = {
    topartists?: {
      artist?: Array<{ name?: string; playcount?: string }>;
    };
  };

  try {
    const data = await fetchJson<TopArtistsResponse>({
      method: 'user.gettopartists',
      user: username,
      period,
      limit: String(clamp(limit, 1, 50)),
    });

    return (data.topartists?.artist ?? [])
      .filter((artist) => Boolean(artist?.name))
      .map((artist) => ({
        name: artist.name ?? '',
        playCount: Number.parseInt(artist.playcount ?? '0', 10) || 0,
      }));
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm top artists:', error);
    return [];
  }
}

export async function getUserInfo(username: string): Promise<LastFmUserInfo | null> {
  if (!username?.trim()) return null;

  type UserInfoResponse = {
    user?: {
      playcount?: string;
      registered?: { unixtime?: string };
    };
  };

  try {
    const data = await fetchJson<UserInfoResponse>({ method: 'user.getinfo', user: username });
    const playCount = Number.parseInt(data.user?.playcount ?? '0', 10) || 0;
    const registeredUnix = Number.parseInt(data.user?.registered?.unixtime ?? '0', 10);
    const registeredAt = Number.isFinite(registeredUnix) && registeredUnix > 0
      ? new Date(registeredUnix * 1000).toISOString()
      : '';
    return { playCount, registeredAt };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Last.fm user info:', error);
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
