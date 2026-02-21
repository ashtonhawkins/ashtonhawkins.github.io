import type { ReadingSlideData } from '@lib/literal';

const REQUEST_TIMEOUT_MS = 5_000;

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function fetchData(): Promise<ReadingSlideData | null> {
  try {
    const response = await fetch('/api/nucleus/reading.json', {
      signal: withTimeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('[Nucleus] Failed to fetch reading slide data:', response.status);
      return null;
    }

    return (await response.json()) as ReadingSlideData | null;
  } catch (error) {
    console.error('[Nucleus] Failed to fetch reading data:', error);
    return null;
  }
}
