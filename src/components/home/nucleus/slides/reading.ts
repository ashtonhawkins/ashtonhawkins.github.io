import type { SlideData, SlideModule } from '../types';

export const readingSlide: SlideModule = {
  id: 'reading',

  async fetchData(): Promise<SlideData> {
    return {
      label: 'READING',
      detail: 'Awaiting Literal sync',
      link: '#consumption',
      updatedAt: new Date().toISOString(),
      renderData: {}
    };
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
