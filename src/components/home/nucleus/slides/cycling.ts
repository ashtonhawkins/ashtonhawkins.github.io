import type { SlideData } from '@lib/strava';

export async function fetchData(): Promise<SlideData | null> {
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
}

export default {
  fetchData
};
