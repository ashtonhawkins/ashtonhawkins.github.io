import { fetchRetry } from './fetch-retry';

const LITERAL_API_URL = 'https://literal.club/graphql/';

type LiteralAuthor = { name: string };

type LiteralBook = {
  id: string;
  title: string;
  pageCount: number | null;
  description: string | null;
  authors: LiteralAuthor[];
  cover: string | null;
  genres: string[];
};

type LiteralReadingState = {
  status: string;
  book: LiteralBook | null;
  createdAt: string;
  updatedAt: string;
};

type LiteralGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export type ReadingStatus = 'reading' | 'finished';

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

async function fetchLiteralGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const token = import.meta.env.LITERAL_API_TOKEN;
  if (!token) {
    console.error('[Nucleus] Missing LITERAL_API_TOKEN.');
    return null;
  }

  const response = await fetchRetry(LITERAL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Literal API request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as LiteralGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }

  return payload.data ?? null;
}

const MY_READING_STATES_QUERY = /* GraphQL */ `
  query myReadingStates {
    myReadingStates {
      status
      book {
        id
        title
        pageCount
        description
        authors {
          name
        }
        cover
        genres
      }
      createdAt
      updatedAt
    }
  }
`;

async function getMyReadingStates(): Promise<LiteralReadingState[]> {
  const data = await fetchLiteralGraphQL<{ myReadingStates: LiteralReadingState[] }>(MY_READING_STATES_QUERY);
  return data?.myReadingStates ?? [];
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

function toReadingSlideData(state: LiteralReadingState, status: ReadingStatus): ReadingSlideData | null {
  if (!state.book) return null;

  const author = state.book.authors?.[0]?.name || 'Unknown Author';
  const detailParts = [`${state.book.title} – ${author}`];

  return {
    label: 'READING',
    detail: detailParts.join(' · '),
    link: '#consumption',
    updatedAt: state.updatedAt || new Date().toISOString(),
    renderData: {
      title: state.book.title,
      author,
      currentPage: null,
      totalPages: state.book.pageCount || null,
      description: state.book.description || '',
      genres: state.book.genres || [],
      chapterCount: estimateChapters(state.book.pageCount || null),
      pullQuote: extractPullQuote(state.book.description || ''),
      status,
    },
  };
}

export async function fetchReadingData(): Promise<ReadingSlideData | null> {
  const token = import.meta.env.LITERAL_API_TOKEN;
  if (!token) {
    console.error('[Nucleus] Reading data fetch skipped because LITERAL_API_TOKEN is missing.');
    return null;
  }

  try {
    const readingStates = await getMyReadingStates();
    if (!readingStates.length) {
      console.error('[Nucleus] Literal returned no reading states.');
    }
    const sortedStates = [...readingStates].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const currentlyReading = sortedStates.find((state) => state.status === 'IS_READING' && state.book);
    if (currentlyReading) {
      return toReadingSlideData(currentlyReading, 'reading');
    }

    const lastFinished = sortedStates.find((state) => state.status === 'FINISHED' && state.book);
    if (lastFinished) {
      return toReadingSlideData(lastFinished, 'finished');
    }

    return null;
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Literal reading data:', error);
    return null;
  }
}
