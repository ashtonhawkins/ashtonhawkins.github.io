import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';

export const GET: APIRoute = async () => {
  const resume = await getEntry('resume', 'data');
  return new Response(JSON.stringify(resume.data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
};
