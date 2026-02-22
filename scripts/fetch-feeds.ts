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
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemMatch) return [];

    const itemXml = itemMatch[1];
    const filmTitle = textBetween(itemXml, 'letterboxd:filmTitle');
    const filmYear = textBetween(itemXml, 'letterboxd:filmYear');
    const ratingRaw = textBetween(itemXml, 'letterboxd:memberRating');
    const fallbackTitle = textBetween(itemXml, 'title');

    const title = filmTitle ?? fallbackTitle?.replace(/,\s*\d{4}$/, '').trim() ?? 'Unknown';
    const year = filmYear ? parseInt(filmYear, 10) : null;
    const rating = ratingRaw ? parseFloat(ratingRaw) : null;

    return [{ title, year: Number.isFinite(year) ? year : null, rating: Number.isFinite(rating) ? rating : null }];
  } catch (error) {
    console.error('[feeds] Letterboxd fetch failed:', error instanceof Error ? error.message : error);
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

  const [letterboxd, goodreads, lastfm] = await Promise.allSettled([
    fetchLetterboxd(),
    fetchGoodreads(),
    fetchLastfm(),
  ]);

  const lastfmItems = lastfm.status === 'fulfilled' ? lastfm.value : [];

  const payload = {
    updatedAt: new Date().toISOString(),
    items: {
      letterboxd: letterboxd.status === 'fulfilled' ? letterboxd.value : [],
      goodreads: goodreads.status === 'fulfilled' ? goodreads.value : [],
      lastfm: lastfmItems,
      spotify: lastfmItems,
      x: []
    }
  };

  const counts = [
    `letterboxd: ${payload.items.letterboxd.length}`,
    `goodreads: ${payload.items.goodreads.length}`,
    `lastfm/spotify: ${payload.items.spotify.length}`,
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
