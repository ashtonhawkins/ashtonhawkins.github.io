import type { SlideData, SlideModule } from '../types';

export const cyclingSlide: SlideModule = {
  id: 'cycling',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/cycling.json', {
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Cycling API returned ${response.status}`);
      }
      const data = (await response.json()) as SlideData | null;
      return data;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch cycling data:', error);
      return null;
    }
  },

  render(ctx, width, height, _frame, _data, theme) {
    ctx.clearRect(0, 0, width, height);
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.3;
    ctx.textAlign = 'center';
    ctx.fillText('[ CYCLING ]', width / 2, height / 2);
    ctx.globalAlpha = 1;
  }
};