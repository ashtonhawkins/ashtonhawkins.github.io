import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import _sodium from 'libsodium-wrappers';

/**
 * Fetches Spotify data and writes to src/data/spotify/.
 * Run with: npm run spotify:fetch
 *
 * Outputs:
 *   src/data/spotify/now-playing.json    — currently playing track (or last played)
 *   src/data/spotify/recent-tracks.json  — last 50 played tracks
 *   src/data/spotify/top-artists.json    — top artists (short + medium term)
 *   src/data/spotify/top-tracks.json     — top tracks (short + medium term)
 *   src/data/spotify/audio-features.json — audio features for recent/top tracks
 *   src/data/spotify/profile.json        — combined summary for site consumption
 */

const TIMEOUT_MS = 15_000;
const API_BASE = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_DATA_DIR = resolve('src/data/spotify');

// ── Helpers ────────────────────────────────────────────────────────

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ── GitHub Secret Update (same as Strava) ──────────────────────────

async function updateGitHubSecret(secretName: string, secretValue: string): Promise<void> {
  await _sodium.ready;
  const sodium = _sodium;

  const repo = process.env.GITHUB_REPOSITORY;
  const ghPat = process.env.GH_PAT;

  if (!repo || !ghPat) {
    console.log(
      '[spotify] Warning: Cannot update GitHub secret — GH_PAT or GITHUB_REPOSITORY not set (running locally?)'
    );
    return;
  }

  const keyRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/secrets/public-key`,
    {
      headers: {
        Authorization: `Bearer ${ghPat}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  const { key, key_id } = (await keyRes.json()) as { key: string; key_id: string };

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
    console.log(`[spotify] Updated GitHub secret: ${secretName}`);
  } else {
    console.error(`[spotify] Failed to update secret: ${res.status}`);
  }
}

// ── Token Refresh ──────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Spotify OAuth credentials. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN.'
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
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
    expires_in?: number;
  };

  if (!json.access_token) {
    throw new Error('Token refresh response missing access_token');
  }

  // Spotify may issue a new refresh token — persist it
  if (json.refresh_token && json.refresh_token !== refreshToken) {
    console.log('[spotify] New refresh token received — persisting to GitHub Secrets...');
    try {
      await updateGitHubSecret('SPOTIFY_REFRESH_TOKEN', json.refresh_token);
    } catch (error) {
      console.warn(
        '[spotify] Warning: Failed to persist new refresh token:',
        error instanceof Error ? error.message : error
      );
    }
  }

  return json.access_token;
}

// ── API Fetcher ────────────────────────────────────────────────────

async function spotifyGet<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: withTimeout(TIMEOUT_MS),
    });

    // 204 = no content (nothing playing)
    if (response.status === 204) return null;

    if (!response.ok) {
      console.error(`[spotify] ${path} returned ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(
      `[spotify] ${path} failed:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

// ── Type Definitions ───────────────────────────────────────────────

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtistSimple {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

interface SpotifyArtistFull extends SpotifyArtistSimple {
  images: SpotifyImage[];
  genres: string[];
  // NOTE: popularity field removed in Feb 2026 API changes
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  album_type: string;
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistSimple[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  // NOTE: popularity field removed in Feb 2026 API changes
}

interface CurrentlyPlayingResponse {
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number | null;
  currently_playing_type: string;
}

interface RecentlyPlayedResponse {
  items: Array<{
    track: SpotifyTrack;
    played_at: string;
  }>;
}

interface TopItemsResponse<T> {
  items: T[];
  total: number;
}

interface AudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  loudness: number;
  speechiness: number;
}

// ── Data Transform ─────────────────────────────────────────────────

function pickBestImage(images: SpotifyImage[], targetSize: number = 300): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => {
    const aDist = Math.abs((a.width ?? 0) - targetSize);
    const bDist = Math.abs((b.width ?? 0) - targetSize);
    return aDist - bDist;
  });
  return sorted[0]?.url ?? null;
}

function buildProfile(
  nowPlaying: CurrentlyPlayingResponse | null,
  recentTracks: RecentlyPlayedResponse | null,
  topArtistsShort: TopItemsResponse<SpotifyArtistFull> | null,
  topArtistsMedium: TopItemsResponse<SpotifyArtistFull> | null,
  topTracksShort: TopItemsResponse<SpotifyTrack> | null,
  _topTracksMedium: TopItemsResponse<SpotifyTrack> | null,
  audioFeatures: AudioFeatures[] | null
): Record<string, unknown> {
  const currentTrack = nowPlaying?.item
    ? {
        name: nowPlaying.item.name,
        artist: nowPlaying.item.artists.map((a) => a.name).join(', '),
        album: nowPlaying.item.album.name,
        albumArt: pickBestImage(nowPlaying.item.album.images),
        albumArtLarge: pickBestImage(nowPlaying.item.album.images, 640),
        isPlaying: nowPlaying.is_playing,
        progressMs: nowPlaying.progress_ms,
        durationMs: nowPlaying.item.duration_ms,
        spotifyUrl: nowPlaying.item.external_urls.spotify,
        id: nowPlaying.item.id,
      }
    : null;

  const lastPlayed = recentTracks?.items?.[0]
    ? {
        name: recentTracks.items[0].track.name,
        artist: recentTracks.items[0].track.artists.map((a) => a.name).join(', '),
        album: recentTracks.items[0].track.album.name,
        albumArt: pickBestImage(recentTracks.items[0].track.album.images),
        albumArtLarge: pickBestImage(recentTracks.items[0].track.album.images, 640),
        playedAt: recentTracks.items[0].played_at,
        spotifyUrl: recentTracks.items[0].track.external_urls.spotify,
        id: recentTracks.items[0].track.id,
      }
    : null;

  const recentAlbums = new Map<string, { name: string; artist: string; art: string | null; playedAt: string }>();
  for (const item of recentTracks?.items ?? []) {
    const albumId = item.track.album.id;
    if (!recentAlbums.has(albumId)) {
      recentAlbums.set(albumId, {
        name: item.track.album.name,
        artist: item.track.artists.map((a) => a.name).join(', '),
        art: pickBestImage(item.track.album.images),
        playedAt: item.played_at,
      });
    }
  }

  const topArtists = (topArtistsShort?.items ?? []).slice(0, 10).map((a) => ({
    name: a.name,
    genres: a.genres.slice(0, 3),
    image: pickBestImage(a.images),
    spotifyUrl: a.external_urls.spotify,
    id: a.id,
  }));

  const topArtistsMed = (topArtistsMedium?.items ?? []).slice(0, 10).map((a) => ({
    name: a.name,
    genres: a.genres.slice(0, 3),
    image: pickBestImage(a.images),
    spotifyUrl: a.external_urls.spotify,
    id: a.id,
  }));

  const topTracks = (topTracksShort?.items ?? []).slice(0, 10).map((t) => ({
    name: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    albumArt: pickBestImage(t.album.images),
    previewUrl: t.preview_url,
    spotifyUrl: t.external_urls.spotify,
    id: t.id,
  }));

  let mood: Record<string, number> | null = null;
  if (audioFeatures && audioFeatures.length > 0) {
    const avg = (key: keyof AudioFeatures) => {
      const vals = audioFeatures.map((f) => f[key]).filter((v): v is number => typeof v === 'number');
      return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
    };
    mood = {
      energy: avg('energy'),
      valence: avg('valence'),
      danceability: avg('danceability'),
      acousticness: avg('acousticness'),
      tempo: Math.round(avg('tempo')),
    };
  }

  const genreCounts = new Map<string, number>();
  for (const a of [...(topArtistsShort?.items ?? []), ...(topArtistsMedium?.items ?? [])]) {
    for (const g of a.genres) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  return {
    fetchedAt: new Date().toISOString(),
    currentTrack,
    lastPlayed,
    recentAlbums: [...recentAlbums.values()].slice(0, 8),
    topArtists,
    topArtistsMedium: topArtistsMed,
    topTracks,
    mood,
    topGenres,
  };
}

// ── Main ───────────────────────────────────────────────────────────

export async function main() {
  console.log('[spotify] Fetching Spotify data...');

  let token: string;
  try {
    token = await refreshAccessToken();
  } catch (error) {
    console.error('[spotify] Auth failed:', error instanceof Error ? error.message : error);
    console.error('[spotify] Skipping data fetch — cached JSON files will be preserved.');
    return;
  }

  await mkdir(SPOTIFY_DATA_DIR, { recursive: true });
  const fetchedAt = new Date().toISOString();

  console.log('[spotify] Fetching currently playing, recent tracks, top artists, top tracks...');

  const [nowPlaying, recentTracks, topArtistsShort, topArtistsMedium, topTracksShort, topTracksMedium] =
    await Promise.all([
      spotifyGet<CurrentlyPlayingResponse>('/me/player/currently-playing', token),
      spotifyGet<RecentlyPlayedResponse>('/me/player/recently-played?limit=50', token),
      spotifyGet<TopItemsResponse<SpotifyArtistFull>>(
        '/me/top/artists?time_range=short_term&limit=20',
        token
      ),
      spotifyGet<TopItemsResponse<SpotifyArtistFull>>(
        '/me/top/artists?time_range=medium_term&limit=20',
        token
      ),
      spotifyGet<TopItemsResponse<SpotifyTrack>>(
        '/me/top/tracks?time_range=short_term&limit=20',
        token
      ),
      spotifyGet<TopItemsResponse<SpotifyTrack>>(
        '/me/top/tracks?time_range=medium_term&limit=20',
        token
      ),
    ]);

  const trackIds = new Set<string>();

  if (nowPlaying?.item) trackIds.add(nowPlaying.item.id);
  for (const item of recentTracks?.items ?? []) trackIds.add(item.track.id);
  for (const t of topTracksShort?.items ?? []) trackIds.add(t.id);
  for (const t of topTracksMedium?.items ?? []) trackIds.add(t.id);

  let audioFeatures: AudioFeatures[] = [];
  if (trackIds.size > 0) {
    const ids = [...trackIds].slice(0, 100).join(',');
    const featuresRes = await spotifyGet<{ audio_features: (AudioFeatures | null)[] }>(
      `/audio-features?ids=${ids}`,
      token
    );
    if (featuresRes?.audio_features) {
      audioFeatures = featuresRes.audio_features.filter((f): f is AudioFeatures => f !== null);
    }
    console.log(`[spotify] Fetched audio features for ${audioFeatures.length} tracks`);
  }

  const writeJson = async (filename: string, data: unknown) => {
    const path = resolve(SPOTIFY_DATA_DIR, filename);
    await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`[spotify] Wrote ${path}`);
  };

  await Promise.all([
    writeJson('now-playing.json', { fetchedAt, data: nowPlaying }),
    writeJson('recent-tracks.json', { fetchedAt, data: recentTracks }),
    writeJson('top-artists.json', {
      fetchedAt,
      shortTerm: topArtistsShort,
      mediumTerm: topArtistsMedium,
    }),
    writeJson('top-tracks.json', {
      fetchedAt,
      shortTerm: topTracksShort,
      mediumTerm: topTracksMedium,
    }),
    writeJson('audio-features.json', { fetchedAt, data: audioFeatures }),
  ]);

  const profile = buildProfile(
    nowPlaying,
    recentTracks,
    topArtistsShort,
    topArtistsMedium,
    topTracksShort,
    topTracksMedium,
    audioFeatures
  );

  await writeJson('profile.json', profile);

  const playing = nowPlaying?.item
    ? `"${nowPlaying.item.name}" by ${nowPlaying.item.artists[0]?.name} (${nowPlaying.is_playing ? 'playing' : 'paused'})`
    : 'Nothing currently playing';

  console.log(`\n[spotify] Done!`);
  console.log(`[spotify] Now playing: ${playing}`);
  console.log(`[spotify] Recent tracks: ${recentTracks?.items?.length ?? 0}`);
  console.log(`[spotify] Top artists (4wk): ${topArtistsShort?.items?.length ?? 0}`);
  console.log(`[spotify] Top tracks (4wk): ${topTracksShort?.items?.length ?? 0}`);
  console.log(`[spotify] Audio features: ${audioFeatures.length}`);
  if (profile.mood) {
    const m = profile.mood as Record<string, number>;
    console.log(
      `[spotify] Mood: energy=${m.energy} valence=${m.valence} dance=${m.danceability} tempo=${m.tempo}bpm`
    );
  }
  if (profile.topGenres) {
    const genres = (profile.topGenres as Array<{ genre: string }>).slice(0, 5).map((g) => g.genre);
    console.log(`[spotify] Top genres: ${genres.join(', ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[spotify] Unexpected error:', error);
    // Exit cleanly so cached JSON files are preserved
  });
}
