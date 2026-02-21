const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const BACKOFF_BASE_MS = 1_000;

export interface FetchRetryOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRetry(
  input: RequestInfo | URL,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff = BACKOFF_BASE_MS * 2 ** (attempt - 1);
      await delay(backoff);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok && response.status >= 500 && attempt < retries) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        console.error(`[fetch-retry] Attempt ${attempt + 1} failed for ${String(input)}: ${response.status}. Retrying...`);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < retries) {
        console.error(`[fetch-retry] Attempt ${attempt + 1} failed for ${String(input)}: ${error instanceof Error ? error.message : error}. Retrying...`);
        continue;
      }
    }
  }

  throw lastError;
}
