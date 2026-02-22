import type { APIRoute } from 'astro';
import { fetchReadingData } from '@lib/goodreads';

export const GET: APIRoute = async () => {
  try {
    const data = await fetchReadingData();

    if (!data) {
      console.error('[Nucleus] Reading route returned null. Check PUBLIC_GOODREADS_USER_ID and Goodreads RSS feed.');
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
