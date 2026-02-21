export interface WatchingRenderData {
  type: 'film' | 'tv';
  title: string;
  year: number;
  rating: number | null;
  director: string | null;
  cast: string[];
  genres: string[];
  runtime: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

export interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: WatchingRenderData;
}

export async function fetchData(): Promise<SlideData | null> {
  try {
    const response = await fetch('/api/nucleus/watching.json');

    if (!response.ok) {
      console.error(`[Nucleus] Failed to fetch Watching slide data: ${response.status} ${response.statusText}`);
      return null;
    }

    return (await response.json()) as SlideData | null;
  } catch (error) {
    console.error('[Nucleus] Failed to fetch Watching slide data.', error);
    return null;
  }
}
