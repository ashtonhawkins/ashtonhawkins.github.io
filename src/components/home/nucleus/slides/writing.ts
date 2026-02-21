import type { SlideData, SlideModule } from '../types';

export interface WritingRenderData {
  title: string;
  category: string;
  tags: string[];
  keyTerms: string[];
  wordCount: number;
  paragraphCount: number;
  slug: string;
}

type WritingResponse = {
  title: string;
  category?: string;
  tags?: string[];
  date?: string;
  slug: string;
  wordCount?: number;
  paragraphCount?: number;
};

interface CloudWord {
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface TopicTag {
  text: string;
  x: number;
  y: number;
  vx: number;
}

declare global {
  interface Window {
    __nucleusWritingData?: WritingResponse | null;
  }
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function splitTitle(title: string): [string, string] {
  if (title.length <= 40) return [title, ''];

  const midpoint = Math.floor(title.length / 2);
  let splitIndex = title.lastIndexOf(' ', midpoint);
  if (splitIndex < Math.floor(title.length * 0.25)) {
    splitIndex = title.indexOf(' ', midpoint);
  }

  if (splitIndex === -1) {
    splitIndex = midpoint;
  }

  return [title.slice(0, splitIndex).trim(), title.slice(splitIndex).trim()];
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

let revealStart: number | null = null;
let cloudWords: CloudWord[] = [];
let topicTags: TopicTag[] = [];

function seedCloudWords(renderData: WritingRenderData, width: number, height: number) {
  const titleSeed = renderData.title.length;
  cloudWords = renderData.keyTerms.slice(0, 10).map((term, i) => ({
    text: term,
    x: ((hash(`${term}${i}${titleSeed}`) % 100) / 100) * width,
    y: ((hash(`${term}${i}y${titleSeed}`) % 100) / 100) * height,
    vx: (hash(`${term}vx${titleSeed}`) % 60 - 30) / 100,
    vy: (hash(`${term}vy${titleSeed}`) % 30 - 15) / 100,
    size: 10 + (hash(`${term}sz${titleSeed}`) % 13),
    alpha: 0.04 + (hash(`${term}a${titleSeed}`) % 7) / 100
  }));
}

function seedTags(renderData: WritingRenderData, width: number, height: number) {
  const allTags = [renderData.category, ...renderData.tags].filter(Boolean);
  const tagCount = Math.max(allTags.length, 1);

  topicTags = allTags.map((tag, i) => {
    const lane = (i + 1) / (tagCount + 1);
    const xJitter = (hash(`${tag}x`) % 100) / 100;
    const yJitter = (hash(`${tag}y`) % 100) / 100;
    const speed = 0.05 + (hash(`${tag}v`) % 6) / 100;
    const direction = hash(`${tag}dir`) % 2 === 0 ? 1 : -1;

    return {
      text: tag,
      x: clamp((lane + (xJitter - 0.5) * 0.12) * width, 0, width),
      y: (height * 0.68) + yJitter * (height * 0.26),
      vx: speed * direction
    };
  });
}

export const writingSlide: SlideModule = {
  id: 'writing',

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
  },

  reset() {
    revealStart = null;
    cloudWords = [];
    topicTags = [];
  },

  render(ctx, width, height, frame, data, theme) {
    if (revealStart === null) revealStart = performance.now();
    const renderData = (data?.renderData || {}) as WritingRenderData;
    const accent = theme.accent;

    if (cloudWords.length === 0) {
      seedCloudWords(renderData, width, height);
      seedTags(renderData, width, height);
    }

    const elapsed = performance.now() - revealStart;

    ctx.clearRect(0, 0, width, height);

    // 1) Word cloud drift
    cloudWords.forEach((word) => {
      word.x += word.vx;
      word.y += word.vy;

      if (word.x > width + 80) word.x = -80;
      if (word.x < -80) word.x = width + 80;
      if (word.y > height + 30) word.y = -30;
      if (word.y < -30) word.y = height + 30;

      ctx.font = `${word.size}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = accent;
      ctx.globalAlpha = word.alpha;
      ctx.fillText(word.text, word.x, word.y);
    });
    ctx.globalAlpha = 1;

    // 2) Paragraph blocks
    const visibleParagraphs = Math.min(renderData.paragraphCount || 0, 15);
    const paragraphAreaX = width * 0.68;
    const paragraphAreaW = width * 0.26;
    const paragraphStartY = height * 0.35;

    for (let i = 0; i < visibleParagraphs; i += 1) {
      const revealOffset = i * 150;
      if (elapsed <= revealOffset) continue;

      const fadeMultiplier = clamp((elapsed - revealOffset) / 300, 0, 1);
      const widthFactor = 0.6 + (hash(`${renderData.slug}p${i}`) % 31) / 100;
      const blockW = paragraphAreaW * widthFactor;
      const blockY = paragraphStartY + (i * 12);

      ctx.fillStyle = accent;
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.05 * fadeMultiplier;
      ctx.fillRect(paragraphAreaX, blockY, blockW, 4);
      ctx.globalAlpha = 0.1 * fadeMultiplier;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(paragraphAreaX, blockY, blockW, 4);
    }
    ctx.globalAlpha = 1;

    // 3) Topic tags
    ctx.font = '7px "IBM Plex Mono", monospace';
    topicTags.forEach((tag) => {
      const text = tag.text.toUpperCase();
      const textWidth = ctx.measureText(text).width;
      const badgeW = textWidth + 12;

      tag.x += tag.vx;
      if (tag.x > width + badgeW) tag.x = -badgeW;
      if (tag.x < -badgeW) tag.x = width + badgeW;

      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.08;
      ctx.strokeRect(tag.x, tag.y, badgeW, 16);
      ctx.globalAlpha = 0.12;
      ctx.fillText(text, tag.x + 6, tag.y + 11);
    });
    ctx.globalAlpha = 1;

    // 4) Typewriter title
    const title = renderData.title || '';
    const [line1, line2] = splitTitle(title);
    const totalChars = line1.length + line2.length;
    const typeProgress = Math.floor(elapsed / 80);
    const doneAt = totalChars * 80;
    const cursorVisible = frame % 60 < 30;
    const cursorAllowed = elapsed <= doneAt + 2000;

    const line1Chars = clamp(typeProgress, 0, line1.length);
    const line2Chars = clamp(typeProgress - line1.length, 0, line2.length);
    const line1Text = line1.slice(0, line1Chars);
    const line2Text = line2.slice(0, line2Chars);

    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.font = '14px "IBM Plex Mono", monospace';

    const x = width / 2;
    const y = height * 0.28;

    if (line2) {
      ctx.fillText(line1Text, x, y);
      if (typeProgress > line1.length || line2Chars > 0) {
        ctx.fillText(line2Text, x, y + 20);
      }

      if (cursorVisible && cursorAllowed) {
        const isSecondLine = typeProgress > line1.length;
        const cursorLineText = isSecondLine ? line2Text : line1Text;
        const cursorY = isSecondLine ? y + 20 : y;
        const cursorX = x + (ctx.measureText(cursorLineText).width / 2) + 4;
        ctx.textAlign = 'left';
        ctx.fillText('_', cursorX, cursorY);
      }
    } else {
      ctx.fillText(line1Text, x, y);
      if (cursorVisible && cursorAllowed) {
        const cursorX = x + (ctx.measureText(line1Text).width / 2) + 4;
        ctx.textAlign = 'left';
        ctx.fillText('_', cursorX, y);
      }
    }

    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;

    // 5) Word count counter
    const countProgress = clamp(elapsed / 2000, 0, 1);
    const easedReveal = 1 - Math.pow(1 - countProgress, 3);
    const displayCount = Math.floor(easedReveal * (renderData.wordCount || 0));
    const label = `${displayCount.toLocaleString()} WORDS`;

    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.25;
    ctx.fillText(label, 16, height - 16);
    ctx.globalAlpha = 1;
  }
};