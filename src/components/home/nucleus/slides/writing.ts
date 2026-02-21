import type { SlideData, SlideModule } from '../types';

export const writingSlide: SlideModule = {
  id: 'writing',

  async fetchData(): Promise<SlideData> {
    return {
      label: 'WRITING',
      detail: 'Awaiting content sync',
      link: '#writing',
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
    ctx.fillText('[ WRITING ]', width / 2, height / 2);
    ctx.globalAlpha = 1;
  }
};
