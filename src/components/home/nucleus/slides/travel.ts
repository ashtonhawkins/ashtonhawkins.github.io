import { LANDMARKS, getSkyline, loadTravelData } from '@lib/travel';

export interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    date: string;
    landmarkName: string;
    landmarkPath: string;
    skylineProfile: [number, number][];
  };
}

export const travelSlide = {
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
};
