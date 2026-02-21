import type { SlideData, SlideModule } from '../types';

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

export const watchingSlide: SlideModule = {
  id: 'watching',

  async fetchData(): Promise<SlideData | null> {
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
  },

  render(ctx, width, height, _frame, _data, theme) {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.3;
    ctx.textAlign = 'center';
    ctx.fillText('[ WATCHING ]', width / 2, height / 2);
    ctx.globalAlpha = 1;
  }
};