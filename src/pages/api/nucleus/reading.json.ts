import { fetchReadingData } from '@lib/literal';

export async function GET() {
  const data = await fetchReadingData();
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
