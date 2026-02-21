import type { SlideData, SlideModule } from '../types';
import { LANDMARKS, getSkyline, loadTravelData } from '@lib/travel';

export const travelSlide: SlideModule = {
  id: 'travel',

  async fetchData(): Promise<SlideData | null> {
    try {
      const travelData = await loadTravelData();
      const trip = travelData?.lastTrip;
      if (!trip) {
        return null;
      }
      const landmark = LANDMARKS[trip.landmark] ?? LANDMARKS.default;
      const skyline = getSkyline(trip.destination.city);
      return {
        label: 'TRAVEL',
        detail: `${trip.destination.city} – ${trip.destination.country}`,
        link: '#travel',
        updatedAt: trip.date,
        renderData: {
          city: trip.destination.city,
          country: trip.destination.country,
          latitude: trip.destination.latitude,
          longitude: trip.destination.longitude,
          date: trip.date,
          landmarkName: landmark.name,
          landmarkPath: landmark.path,
          skylineProfile: skyline,
        },
      };
    } catch (error) {
      console.error('[Nucleus] Failed to fetch travel data:', error);
      return null;
    }
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