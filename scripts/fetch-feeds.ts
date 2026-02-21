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

// ── Literal (GraphQL) ─────────────────────────────────────────────

interface LiteralCacheEntry {
  title: string;
  author: string;
  status: 'reading' | 'finished';
}

async function fetchLiteral(): Promise<LiteralCacheEntry[]> {
  const token = process.env.LITERAL_API_TOKEN;
  if (!token) {
    console.log('[feeds] Skipping Literal: LITERAL_API_TOKEN not set');
    return [];
  }

  const query = `query myReadingStates {
    myReadingStates {
      status
      book { title authors { name } }
      updatedAt
    }
  }`;

  try {
    const response = await fetch('https://literal.club/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: withTimeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[feeds] Literal API returned ${response.status}`);
      return [];
    }

    const json = (await response.json()) as any;
    if (json.errors?.length) {
      console.error('[feeds] Literal GraphQL errors:', json.errors);
      return [];
    }

    const states = json.data?.myReadingStates ?? [];
    const sorted = [...states].sort(
      (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const current = sorted.find((s: any) => s.status === 'IS_READING' && s.book);
    const finished = sorted.find((s: any) => s.status === 'FINISHED' && s.book);
    const pick = current ?? finished;
    if (!pick?.book) return [];

    return [{
      title: pick.book.title,
      author: pick.book.authors?.[0]?.name ?? 'Unknown Author',
      status: pick.status === 'IS_READING' ? 'reading' : 'finished',
    }];
  } catch (error) {
    console.error('[feeds] Literal fetch failed:', error instanceof Error ? error.message : error);
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

  const [letterboxd, literal, lastfm] = await Promise.allSettled([
    fetchLetterboxd(),
    fetchLiteral(),
    fetchLastfm(),
  ]);

  const lastfmItems = lastfm.status === 'fulfilled' ? lastfm.value : [];

  const payload = {
    updatedAt: new Date().toISOString(),
    items: {
      letterboxd: letterboxd.status === 'fulfilled' ? letterboxd.value : [],
      literal: literal.status === 'fulfilled' ? literal.value : [],
      lastfm: lastfmItems,
      spotify: lastfmItems,
      x: []
    }
  };

  const counts = [
    `letterboxd: ${payload.items.letterboxd.length}`,
    `literal: ${payload.items.literal.length}`,
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
