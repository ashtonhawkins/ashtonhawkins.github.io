import type { APIRoute } from 'astro';
import feedsCache from '@data/feeds-cache.json';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(feedsCache), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
