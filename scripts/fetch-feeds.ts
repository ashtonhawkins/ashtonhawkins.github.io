import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Populates src/data/feeds-cache.json with data from external APIs.
 * Run with: npm run feeds:fetch
 *
 * This script uses process.env (not import.meta.env) because it runs
 * outside of Vite/Astro via tsx.
 */

const TIMEOUT_MS = 15_000;

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ── Letterboxd (RSS) ──────────────────────────────────────────────

interface LetterboxdCacheEntry {
  title: string;
  year: number | null;
  rating: number | null;
  watchedAt: string;
  source: 'letterboxd';
  type: 'film';
  url: string;
}

function textBetween(xml: string, tagName: string): string | null {
  const escapedTag = tagName.replace(':', '\\:');
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
}

async function fetchLetterboxd(): Promise<LetterboxdCacheEntry[]> {
  const username = process.env.PUBLIC_LETTERBOXD_USERNAME;
  if (!username) {
    console.log('[feeds] Skipping Letterboxd: PUBLIC_LETTERBOXD_USERNAME not set');
    return [];
  }

  try {
    const response = await fetch(`https://letterboxd.com/${username}/rss/`, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: withTimeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[feeds] Letterboxd RSS returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 12);
    if (!itemMatches.length) return [];

    return itemMatches.map((match) => {
      const itemXml = match[1];
      const filmTitle = textBetween(itemXml, 'letterboxd:filmTitle');
      const filmYear = textBetween(itemXml, 'letterboxd:filmYear');
      const ratingRaw = textBetween(itemXml, 'letterboxd:memberRating');
      const fallbackTitle = textBetween(itemXml, 'title');
      const pubDate = textBetween(itemXml, 'pubDate');
      const url = textBetween(itemXml, 'link') ?? `https://letterboxd.com/${username}/films/`;

      const title = filmTitle ?? fallbackTitle?.replace(/,\s*\d{4}$/, '').trim() ?? 'Unknown';
      const year = filmYear ? parseInt(filmYear, 10) : null;
      const rating = ratingRaw ? parseFloat(ratingRaw) : null;

      return {
        title,
        year: Number.isFinite(year) ? year : null,
        rating: Number.isFinite(rating) ? rating : null,
        watchedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source: 'letterboxd' as const,
        type: 'film' as const,
        url,
      };
    });
  } catch (error) {
    console.error('[feeds] Letterboxd fetch failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ── Trakt (API) ───────────────────────────────────────────────────

interface TraktMovieHistoryItem {
  watched_at: string;
  movie?: {
    title?: string;
    year?: number | null;
    ids?: { slug?: string };
  };
}

interface TraktEpisodeHistoryItem {
  watched_at: string;
  show?: {
    title?: string;
    year?: number | null;
    ids?: { slug?: string };
  };
  episode?: {
    season?: number;
    number?: number;
    title?: string;
  };
}

interface TraktCacheEntry {
  title: string;
  year: number | null;
  watchedAt: string;
  source: 'trakt';
  type: 'film' | 'tv';
  season?: number;
  episode?: number;
  episodeTitle?: string;
  url: string;
}

async function fetchTraktHistory<T>(path: string, clientId: string): Promise<T[]> {
  const response = await fetch(`https://api.trakt.tv${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': clientId,
    },
    signal: withTimeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Trakt ${path} returned ${response.status}`);
  }

  const json = (await response.json()) as T[];
  return Array.isArray(json) ? json : [];
}

async function fetchTrakt(): Promise<TraktCacheEntry[]> {
  const username = process.env.TRAKT_USERNAME ?? process.env.PUBLIC_TRAKT_USERNAME;
  const clientId = process.env.TRAKT_CLIENT_ID ?? process.env.PUBLIC_TRAKT_CLIENT_ID;

  if (!username || !clientId) {
    console.log('[feeds] Skipping Trakt: TRAKT_USERNAME/PUBLIC_TRAKT_USERNAME or TRAKT_CLIENT_ID/PUBLIC_TRAKT_CLIENT_ID not set');
    return [];
  }

  try {
    const [movies, episodes] = await Promise.all([
      fetchTraktHistory<TraktMovieHistoryItem>(`/users/${username}/history/movies?limit=8`, clientId),
      fetchTraktHistory<TraktEpisodeHistoryItem>(`/users/${username}/history/episodes?limit=8`, clientId),
    ]);

    const movieItems: TraktCacheEntry[] = movies
      .filter((item) => item.movie?.title)
      .map((item) => ({
        title: item.movie?.title ?? 'Unknown Movie',
        year: item.movie?.year ?? null,
        watchedAt: new Date(item.watched_at).toISOString(),
        source: 'trakt' as const,
        type: 'film' as const,
        url: item.movie?.ids?.slug ? `https://trakt.tv/movies/${item.movie.ids.slug}` : 'https://trakt.tv/',
      }));

    const episodeItems: TraktCacheEntry[] = episodes
      .filter((item) => item.show?.title)
      .map((item) => ({
        title: item.show?.title ?? 'Unknown Show',
        year: item.show?.year ?? null,
        watchedAt: new Date(item.watched_at).toISOString(),
        source: 'trakt' as const,
        type: 'tv' as const,
        season: item.episode?.season,
        episode: item.episode?.number,
        episodeTitle: item.episode?.title,
        url: item.show?.ids?.slug ? `https://trakt.tv/shows/${item.show.ids.slug}` : 'https://trakt.tv/',
      }));

    return [...movieItems, ...episodeItems]
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .slice(0, 12);
  } catch (error) {
    console.error('[feeds] Trakt fetch failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ── Goodreads (RSS) ──────────────────────────────────────────────

interface GoodreadsCacheEntry {
  title: string;
  author: string;
  status: 'reading' | 'finished';
}

function cdataContent(raw: string | null): string {
  if (!raw) return '';
  return raw.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchGoodreadsShelf(userId: string, shelf: string): Promise<GoodreadsCacheEntry | null> {
  const rssUrl = `https://www.goodreads.com/review/list_rss/${userId}?shelf=${shelf}`;
  const response = await fetch(rssUrl, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: withTimeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    console.error(`[feeds] Goodreads RSS (${shelf}) returned ${response.status}`);
    return null;
  }

  const xml = await response.text();
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;

  const itemXml = itemMatch[1];
  const rawTitle = textBetween(itemXml, 'title');
  const title = rawTitle ? decodeXmlEntities(cdataContent(rawTitle)) : null;
  if (!title) return null;

  const rawAuthor = textBetween(itemXml, 'author_name');
  const author = rawAuthor ? decodeXmlEntities(cdataContent(rawAuthor)) : 'Unknown Author';

  return {
    title,
    author,
    status: shelf === 'currently-reading' ? 'reading' : 'finished',
  };
}

async function fetchGoodreads(): Promise<GoodreadsCacheEntry[]> {
  const userId = process.env.PUBLIC_GOODREADS_USER_ID;
  if (!userId) {
    console.log('[feeds] Skipping Goodreads: PUBLIC_GOODREADS_USER_ID not set');
    return [];
  }

  try {
    const current = await fetchGoodreadsShelf(userId, 'currently-reading');
    if (current) return [current];

    const read = await fetchGoodreadsShelf(userId, 'read');
    if (read) return [read];

    console.log('[feeds] Goodreads: no books found on currently-reading or read shelves');
    return [];
  } catch (error) {
    console.error('[feeds] Goodreads fetch failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ── Last.fm ───────────────────────────────────────────────────────

interface LastfmCacheEntry {
  name: string;
  title: string;
  artist: string;
}

async function fetchLastfm(): Promise<LastfmCacheEntry[]> {
  const apiKey = process.env.PUBLIC_LASTFM_API_KEY;
  const username = process.env.PUBLIC_LASTFM_USERNAME;
  if (!apiKey || !username) {
    console.log('[feeds] Skipping Last.fm: PUBLIC_LASTFM_API_KEY or PUBLIC_LASTFM_USERNAME not set');
    return [];
  }

  try {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: username,
      limit: '1',
      api_key: apiKey,
      format: 'json',
    });

    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
      signal: withTimeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[feeds] Last.fm API returned ${response.status}`);
      return [];
    }

    const json = (await response.json()) as any;
    const track = json.recenttracks?.track?.[0];
    if (!track?.name || !track.artist?.['#text']) return [];

    return [{
      name: track.name,
      title: track.name,
      artist: track.artist['#text'],
    }];
  } catch (error) {
    console.error('[feeds] Last.fm fetch failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────

export async function main() {
  const target = resolve('src/data/feeds-cache.json');

  console.log('[feeds] Fetching external feeds...');

  const [letterboxd, trakt, goodreads, lastfm] = await Promise.allSettled([
    fetchLetterboxd(),
    fetchTrakt(),
    fetchGoodreads(),
    fetchLastfm(),
  ]);

  const letterboxdItems = letterboxd.status === 'fulfilled' ? letterboxd.value : [];
  const traktItems = trakt.status === 'fulfilled' ? trakt.value : [];
  const lastfmItems = lastfm.status === 'fulfilled' ? lastfm.value : [];
  const watchingItems = [...letterboxdItems, ...traktItems]
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .map((item) => ({
      ...item,
      watchedDate: item.watchedAt,
      ...(item.type === 'tv' && item.season != null && item.episode != null
        ? { displayTitle: `${item.title} · S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')}` }
        : {}),
    }))
    .slice(0, 20);

  const currentYear = new Date().getUTCFullYear();
  const thisYearItems = watchingItems.filter((item) => new Date(item.watchedAt).getUTCFullYear() === currentYear);
  const letterboxdRatings = letterboxdItems.map((item) => item.rating).filter((rating): rating is number => typeof rating === 'number');
  const avgRating = letterboxdRatings.length
    ? Number((letterboxdRatings.reduce((sum, rating) => sum + rating, 0) / letterboxdRatings.length).toFixed(2))
    : null;

  const payload = {
    updatedAt: new Date().toISOString(),
    watching: {
      lastUpdated: new Date().toISOString(),
      recentItems: watchingItems,
      stats: {
        totalFilms: thisYearItems.filter((item) => item.type === 'film').length,
        totalEpisodes: thisYearItems.filter((item) => item.type === 'tv').length,
        avgRating,
      },
    },
    items: {
      letterboxd: letterboxdItems,
      trakt: traktItems,
      goodreads: goodreads.status === 'fulfilled' ? goodreads.value : [],
      lastfm: lastfmItems,
      spotify: lastfmItems,
      x: []
    }
  };

  const counts = [
    `letterboxd: ${payload.items.letterboxd.length}`,
    `trakt: ${payload.items.trakt.length}`,
    `goodreads: ${payload.items.goodreads.length}`,
    `lastfm/spotify: ${payload.items.spotify.length}`,
    `watching(combined): ${payload.watching.recentItems.length}`,
  ].join(', ');
  console.log(`[feeds] Done (${counts})`);

  await writeFile(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`[feeds] Wrote ${target}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
