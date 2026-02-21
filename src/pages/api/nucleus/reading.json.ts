import type { APIRoute } from 'astro';
import { fetchReadingData } from '@lib/literal';

export const GET: APIRoute = async () => {
  try {
    const data = await fetchReadingData();

    if (!data) {
      console.error('[Nucleus] Reading route returned null. Check LITERAL_API_TOKEN and Literal API response payload.');
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Nucleus] Reading route failed.', error);
    return new Response(JSON.stringify(null), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
