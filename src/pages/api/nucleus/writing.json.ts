import { getCollection } from 'astro:content';

const countWords = (body: string) => body.trim().split(/\s+/).filter(Boolean).length;
const countParagraphs = (body: string) => body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean).length;

export async function GET() {
  try {
    const posts = await getCollection('writing', ({ data }) => !data.draft);
    const latest = posts.sort((a, b) => {
      const aDate = a.data.pubDate ? new Date(a.data.pubDate).getTime() : 0;
      const bDate = b.data.pubDate ? new Date(b.data.pubDate).getTime() : 0;
      return bDate - aDate;
    })[0];

    if (!latest) {
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tags = latest.data.description
      ? latest.data.description
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      : [];

    return new Response(JSON.stringify({
      title: latest.data.title,
      category: tags[0] || 'Essay',
      tags,
      date: latest.data.pubDate ? new Date(latest.data.pubDate).toISOString() : new Date().toISOString(),
      slug: latest.slug,
      wordCount: countWords(latest.body),
      paragraphCount: countParagraphs(latest.body)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Nucleus] Failed to load writing collection:', error);
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
