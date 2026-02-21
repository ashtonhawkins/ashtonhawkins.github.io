import type { SlideData, SlideModule } from '../types';

export const travelSlide: SlideModule = {
  id: 'travel',

  async fetchData(): Promise<SlideData> {
    return {
      label: 'TRAVEL',
      detail: 'Awaiting Flighty sync',
      link: '#travel',
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
    ctx.fillText('[ TRAVEL ]', width / 2, height / 2);
    ctx.globalAlpha = 1;
  }
};
