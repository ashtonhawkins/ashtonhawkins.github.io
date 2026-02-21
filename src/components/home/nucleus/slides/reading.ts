import type { SlideData, SlideModule } from '../types';

const REQUEST_TIMEOUT_MS = 5_000;

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export const readingSlide: SlideModule = {
  id: 'reading',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/reading.json', {
        signal: withTimeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error('[Nucleus] Failed to fetch reading slide data:', response.status);
        return null;
      }
      return (await response.json()) as SlideData | null;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch reading data:', error);
      return null;
    }
  },

  render(ctx, width, height, _frame, _data, theme) {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.3;
    ctx.textAlign = 'center';
    ctx.fillText('[ READING ]', width / 2, height / 2);
    ctx.globalAlpha = 1;
  }
};