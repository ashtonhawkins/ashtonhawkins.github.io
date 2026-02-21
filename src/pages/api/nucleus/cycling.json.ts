import type { APIRoute } from 'astro';
import { fetchCyclingData } from '@lib/strava';

export const GET: APIRoute = async () => {
  const data = await fetchCyclingData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
};
