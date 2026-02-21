const LETTERBOXD_BASE_URL = 'https://letterboxd.com';
const REQUEST_TIMEOUT_MS = 5_000;

export interface LetterboxdFilmEntry {
  title: string;
  year: number | null;
  link: string;
  watchedAt: string;
  rating: number | null;
  posterUrl: string | null;
}

function textBetween(xml: string, tagName: string): string | null {
  const escapedTag = tagName.replace(':', '\\:');
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
  const match = xml.match(regex);

  return match?.[1]?.trim() ?? null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseTitleAndYear(rawTitle: string | null): { title: string; year: number | null } {
  const fallback = { title: rawTitle ? decodeXmlEntities(rawTitle) : 'Unknown Film', year: null };

  if (!rawTitle) {
    return fallback;
  }

  const match = rawTitle.match(/^(.*?),\s*(\d{4})$/);
  if (!match) {
    return fallback;
  }

  return {
    title: decodeXmlEntities(match[1].trim()),
    year: Number.parseInt(match[2], 10)
  };
}

function parsePosterFromDescription(description: string | null): string | null {
  if (!description) {
    return null;
  }

  const imageMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imageMatch?.[1] ?? null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchLatestFilm(username?: string): Promise<LetterboxdFilmEntry | null> {
  if (!username) {
    return null;
  }

  const rssUrl = `${LETTERBOXD_BASE_URL}/${username}/rss/`;

  try {
    const response = await fetchWithTimeout(rssUrl, REQUEST_TIMEOUT_MS);
    if (!response.ok) {
      console.error(`[Nucleus] Letterboxd RSS request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const xml = await response.text();
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemMatch) {
      return null;
    }

    const itemXml = itemMatch[1];
    const namespacedTitle = textBetween(itemXml, 'letterboxd:filmTitle');
    const namespacedYear = textBetween(itemXml, 'letterboxd:filmYear');
    const pubDate = textBetween(itemXml, 'pubDate');
    const rawTitle = textBetween(itemXml, 'title');

    const parsedTitleYear = parseTitleAndYear(rawTitle);

    const title = namespacedTitle ? decodeXmlEntities(namespacedTitle) : parsedTitleYear.title;
    const year = namespacedYear ? Number.parseInt(namespacedYear, 10) : parsedTitleYear.year;
    const link = decodeXmlEntities(textBetween(itemXml, 'link') ?? `${LETTERBOXD_BASE_URL}/${username}/films/`);
    const ratingRaw = textBetween(itemXml, 'letterboxd:memberRating');
    const rating = ratingRaw ? Number.parseFloat(ratingRaw) : null;
    const watchedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    const description = textBetween(itemXml, 'description');

    return {
      title,
      year: Number.isFinite(year) ? year : null,
      link,
      watchedAt,
      rating: Number.isFinite(rating) ? rating : null,
      posterUrl: parsePosterFromDescription(description)
    };
  } catch (error) {
    console.error('[Nucleus] Failed to fetch or parse Letterboxd RSS.', error);
    return null;
  }
}
