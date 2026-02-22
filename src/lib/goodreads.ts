import { fetchRetry } from './fetch-retry';

const GOODREADS_BASE_URL = 'https://www.goodreads.com/review/list_rss';

export type ReadingStatus = 'reading' | 'finished';

export interface GoodreadsBook {
  title: string;
  author: string;
  coverUrl: string | null;
  rating: number | null;
  bookId: string | null;
  numPages: number | null;
  description: string;
}

export type ReadingSlideData = {
  label: 'READING';
  detail: string;
  link: '#consumption';
  updatedAt: string;
  renderData: {
    title: string;
    author: string;
    currentPage: number | null;
    totalPages: number | null;
    description: string;
    genres: string[];
    chapterCount: number;
    pullQuote: string;
    status: ReadingStatus;
  };
};

function textBetween(xml: string, tagName: string): string | null {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? null;
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

export function estimateChapters(pageCount: number | null): number {
  if (!pageCount) return 12;
  return Math.max(5, Math.round(pageCount / 22));
}

export function extractPullQuote(description: string): string {
  if (!description) return '';
  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? '';
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence;
}

function parseGoodreadsItem(itemXml: string): GoodreadsBook | null {
  const rawTitle = textBetween(itemXml, 'title');
  const title = rawTitle ? decodeXmlEntities(cdataContent(rawTitle)) : null;
  if (!title) return null;

  const rawAuthor = textBetween(itemXml, 'author_name');
  const author = rawAuthor ? decodeXmlEntities(cdataContent(rawAuthor)) : 'Unknown Author';

  const coverUrl = textBetween(itemXml, 'book_large_image_url') || null;

  const ratingRaw = textBetween(itemXml, 'user_rating');
  const rating = ratingRaw ? Number.parseInt(ratingRaw, 10) : null;

  const bookId = textBetween(itemXml, 'book_id') || null;

  const numPagesRaw = textBetween(itemXml, 'num_pages');
  const numPages = numPagesRaw ? Number.parseInt(numPagesRaw, 10) : null;

  const rawDescription = textBetween(itemXml, 'book_description');
  const description = rawDescription ? stripHtml(decodeXmlEntities(cdataContent(rawDescription))) : '';

  return {
    title,
    author,
    coverUrl,
    rating: rating && Number.isFinite(rating) && rating > 0 ? rating : null,
    bookId,
    numPages: numPages && Number.isFinite(numPages) ? numPages : null,
    description,
  };
}

async function fetchGoodreadsShelf(userId: string, shelf: string): Promise<GoodreadsBook | null> {
  const rssUrl = `${GOODREADS_BASE_URL}/${userId}?shelf=${shelf}`;

  const response = await fetchRetry(rssUrl, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    console.error(`[Nucleus] Goodreads RSS (${shelf}) request failed: ${response.status} ${response.statusText}`);
    return null;
  }

  const xml = await response.text();
  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
  if (!itemMatch) {
    console.error(`[Nucleus] Goodreads RSS (${shelf}) had no <item> entries.`);
    return null;
  }

  return parseGoodreadsItem(itemMatch[1]);
}

function toReadingSlideData(book: GoodreadsBook, status: ReadingStatus): ReadingSlideData {
  return {
    label: 'READING',
    detail: `${book.title} – ${book.author}`,
    link: '#consumption',
    updatedAt: new Date().toISOString(),
    renderData: {
      title: book.title,
      author: book.author,
      currentPage: null,
      totalPages: book.numPages,
      description: book.description,
      genres: [],
      chapterCount: estimateChapters(book.numPages),
      pullQuote: extractPullQuote(book.description),
      status,
    },
  };
}

export async function fetchReadingData(): Promise<ReadingSlideData | null> {
  const userId = import.meta.env.PUBLIC_GOODREADS_USER_ID;
  if (!userId) {
    console.error('[Nucleus] Reading data fetch skipped because PUBLIC_GOODREADS_USER_ID is missing.');
    return null;
  }

  try {
    // Try currently-reading shelf first
    const currentBook = await fetchGoodreadsShelf(userId, 'currently-reading');
    if (currentBook) {
      return toReadingSlideData(currentBook, 'reading');
    }

    // Fall back to most recently read book
    const readBook = await fetchGoodreadsShelf(userId, 'read');
    if (readBook) {
      return toReadingSlideData(readBook, 'finished');
    }

    console.error('[Nucleus] Goodreads returned no books on currently-reading or read shelves.');
    return null;
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Goodreads reading data:', error);
    return null;
  }
}
