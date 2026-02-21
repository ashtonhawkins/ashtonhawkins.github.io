import type { APIRoute } from 'astro';
import { fetchCyclingData } from '@lib/strava';

export const GET: APIRoute = async () => {
  try {
    const data = await fetchCyclingData();

    if (!data) {
      console.error('[Nucleus] Cycling route returned null. Check Strava credentials, refresh-token scopes, and latest activity type.');
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('[Nucleus] Cycling route failed.', error);

    return new Response(JSON.stringify(null), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
};
