export type SlideData = {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: {
    title: string;
    category: string;
    tags: string[];
    keyTerms: string[];
    wordCount: number;
    paragraphCount: number;
    slug: string;
  };
};

type WritingResponse = {
  title: string;
  category?: string;
  tags?: string[];
  date?: string;
  slug: string;
  wordCount?: number;
  paragraphCount?: number;
};

declare global {
  interface Window {
    __nucleusWritingData?: WritingResponse | null;
  }
}

function extractKeyTerms(title: string, tags: string[], category: string): string[] {
  const terms = new Set<string>();

  tags.forEach((tag) => terms.add(tag));
  if (category) terms.add(category);

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it',
    'this', 'that', 'my', 'how', 'what', 'why', 'when'
  ]);

  title.split(/\s+/).forEach((word) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length > 3 && !stopWords.has(clean)) {
      terms.add(word.replace(/[^a-zA-Z0-9\s]/g, ''));
    }
  });

  return Array.from(terms).filter(Boolean).slice(0, 10);
}

export const writingSlide = {
  async fetchData(): Promise<SlideData | null> {
    try {
      const data = window.__nucleusWritingData
        || await fetch('/api/nucleus/writing.json').then((response) => response.json() as Promise<WritingResponse | null>);

      if (!data) return null;

      const tags = data.tags || [];
      const category = data.category || tags[0] || 'Essay';
      const keyTerms = extractKeyTerms(data.title, tags, category);

      return {
        label: 'WRITING',
        detail: `${data.title} – ${category}`,
        link: '#writing',
        updatedAt: data.date || new Date().toISOString(),
        renderData: {
          title: data.title,
          category,
          tags,
          keyTerms,
          wordCount: data.wordCount || 0,
          paragraphCount: data.paragraphCount || 0,
          slug: data.slug
        }
      };
    } catch (error) {
      console.error('[Nucleus] Failed to fetch writing data:', error);
      return null;
    }
  }
};
