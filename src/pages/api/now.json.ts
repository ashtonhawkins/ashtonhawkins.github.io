import type { APIRoute } from 'astro';
import site from '@data/site.json';

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ status: 'ok', now: site.now ?? null }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
