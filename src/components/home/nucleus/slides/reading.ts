import type { SlideData, SlideModule } from '../types';

const REQUEST_TIMEOUT_MS = 5_000;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789.,:;';
const BASE_STREAM_LENGTH = 80;

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export type ReadingRenderData = {
  title: string;
  author: string;
  currentPage: number | null;
  totalPages: number | null;
  description: string;
  genres: string[];
  chapterCount: number;
  pullQuote: string;
  status: 'reading' | 'finished';
};

type StreamLayer = 'back' | 'mid' | 'front';

type Stream = {
  y: number;
  speed: number;
  baseAlpha: number;
  fontSize: number;
  offset: number;
  chars: string[];
  layer: StreamLayer;
};

type ReadingState = {
  key: string;
  streams: Stream[];
  lastMeasuredWidths: number[];
};

const stateByContext = new WeakMap<CanvasRenderingContext2D, ReadingState>();

const randomChar = (): string => ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? 'a';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const wordWrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let currentLine = words[0] ?? '';

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${currentLine} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i] ?? '';
    }
  }

  lines.push(currentLine);
  return lines;
};

const createStreamChars = (chapterCount: number): string[] => {
  const chars = Array.from({ length: BASE_STREAM_LENGTH }, randomChar);
  if (chapterCount <= 0) return chars;

  const interval = Math.max(2, Math.floor(BASE_STREAM_LENGTH / Math.max(1, chapterCount)));
  for (let i = interval - 1; i < chars.length; i += interval) {
    chars[i] = '|';
  }

  return chars;
};

const ensureState = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  totalPages: number | null,
  chapterCount: number,
  title: string,
): ReadingState => {
  const streamCount = totalPages && totalPages > 420 ? 8 : 6;
  const key = `${width}x${height}:${streamCount}:${chapterCount}:${title}`;
  const existing = stateByContext.get(ctx);

  if (existing && existing.key === key) return existing;

  const streams: Stream[] = [];
  const denominator = Math.max(streamCount - 1, 1);

  for (let i = 0; i < streamCount; i += 1) {
    const depth = i / denominator;
    const jitter = (Math.random() - 0.5) * (height * 0.05);
    let layer: StreamLayer = 'mid';

    if (depth < 0.34) layer = 'back';
    else if (depth > 0.67) layer = 'front';

    const fontSize = layer === 'front' ? 11 : layer === 'mid' ? 9 : 8;
    const speed = layer === 'front' ? 24 + Math.random() * 6 : layer === 'mid' ? 14 + Math.random() * 6 : 10 + Math.random() * 4;
    const alpha = layer === 'front' ? 0.15 + Math.random() * 0.05 : layer === 'mid' ? 0.08 + Math.random() * 0.04 : 0.04 + Math.random() * 0.02;

    streams.push({
      y: ((i + 1) / (streamCount + 1)) * height + jitter,
      speed,
      baseAlpha: alpha,
      fontSize,
      offset: Math.random() * width,
      chars: createStreamChars(chapterCount),
      layer,
    });
  }

  const createdState: ReadingState = {
    key,
    streams,
    lastMeasuredWidths: new Array(streamCount).fill(0),
  };

  stateByContext.set(ctx, createdState);
  return createdState;
};

const drawStreams = (
  ctx: CanvasRenderingContext2D,
  state: ReadingState,
  frame: number,
  width: number,
  accent: string,
  layerFilter: StreamLayer[],
): void => {
  const elapsedSeconds = frame / 1000;

  state.streams.forEach((stream, streamIndex) => {
    if (!layerFilter.includes(stream.layer)) return;

    ctx.font = `${stream.fontSize}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let textWidth = state.lastMeasuredWidths[streamIndex] ?? 0;
    if (!textWidth || textWidth < width * 0.4) {
      textWidth = stream.chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0);
      state.lastMeasuredWidths[streamIndex] = textWidth;
    }

    const cycleWidth = textWidth + width;
    let x = (stream.offset - elapsedSeconds * stream.speed) % cycleWidth;
    if (x < -textWidth) x += cycleWidth;
    if (x > width) x -= cycleWidth;

    for (let repeat = 0; repeat < 2; repeat += 1) {
      let cursorX = x + repeat * cycleWidth;
      for (let i = 0; i < stream.chars.length; i += 1) {
        const char = stream.chars[i] ?? ' ';
        const charWidth = ctx.measureText(char).width;
        if (cursorX + charWidth >= 0 && cursorX <= width) {
          ctx.globalAlpha = char === '|' ? Math.min(stream.baseAlpha + 0.15, 0.45) : stream.baseAlpha;
          ctx.fillStyle = accent;
          ctx.fillText(char, cursorX, stream.y);
        }
        cursorX += charWidth;
      }
    }
  });

  ctx.globalAlpha = 1;
};

const drawPullQuote = (
  ctx: CanvasRenderingContext2D,
  quote: string,
  frame: number,
  width: number,
  height: number,
  accent: string,
): void => {
  const normalizedQuote = quote.trim();
  if (!normalizedQuote) return;

  ctx.save();
  ctx.font = '16px "IBM Plex Mono", monospace';
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.05;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = width * 0.6;
  const lines = wordWrap(ctx, normalizedQuote, maxWidth);
  const lineHeight = 22;
  const quoteBlockHeight = Math.max(1, lines.length) * lineHeight;
  const drift = Math.sin(frame * 0.00015) * 8;
  const startY = height * 0.5 - quoteBlockHeight / 2 + drift;
  const centerX = width * 0.62;

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });

  ctx.restore();
};

const drawChapterMarkers = (
  ctx: CanvasRenderingContext2D,
  renderData: ReadingRenderData,
  width: number,
  height: number,
  accent: string,
): void => {
  const chapterCount = Math.max(1, renderData.chapterCount || 1);
  const axisWidth = width * 0.7;
  const axisX = (width - axisWidth) / 2;
  const axisY = height * 0.75;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 1;

  ctx.globalAlpha = 0.1;
  ctx.beginPath();
  ctx.moveTo(axisX, axisY);
  ctx.lineTo(axisX + axisWidth, axisY);
  ctx.stroke();

  for (let i = 0; i < chapterCount; i += 1) {
    const t = chapterCount === 1 ? 0.5 : i / (chapterCount - 1);
    const x = axisX + t * axisWidth;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(x, axisY - 3);
    ctx.lineTo(x, axisY + 3);
    ctx.stroke();
  }

  if (renderData.currentPage && renderData.totalPages && renderData.totalPages > 0) {
    const progress = clamp(renderData.currentPage / renderData.totalPages, 0, 1);
    const markerX = axisX + progress * axisWidth;

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(markerX, axisY - 4);
    ctx.lineTo(markerX, axisY + 4);
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(markerX, axisY - 11);
    ctx.lineTo(markerX + 4, axisY - 7);
    ctx.lineTo(markerX, axisY - 3);
    ctx.lineTo(markerX - 4, axisY - 7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
};

const drawSpine = (
  ctx: CanvasRenderingContext2D,
  title: string,
  frame: number,
  height: number,
  accent: string,
): void => {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;

  const pulse = 0.12 + 0.05 * Math.sin(frame * 0.001);
  ctx.globalAlpha = pulse;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(20, height);
  ctx.stroke();

  ctx.translate(14, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.globalAlpha = 0.2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spacedTitle = title
    .toUpperCase()
    .split('')
    .join(' ');

  ctx.fillText(spacedTitle, 0, 0);
  ctx.restore();
};

const drawPageCount = (
  ctx: CanvasRenderingContext2D,
  renderData: ReadingRenderData,
  frame: number,
  width: number,
  height: number,
  accent: string,
): void => {
  let counterText = 'pg — / —';

  if (renderData.status === 'finished') {
    const total = renderData.totalPages ?? '—';
    counterText = `pg ${total} / ${total}`;
  } else if (renderData.currentPage && renderData.totalPages) {
    const simulatedTick = Math.floor(frame / 3000);
    const maxDelta = Math.max(0, renderData.totalPages - renderData.currentPage);
    const delta = maxDelta > 0 ? simulatedTick % (maxDelta + 1) : 0;
    const shownPage = renderData.currentPage + delta;
    counterText = `pg ${shownPage} / ${renderData.totalPages}`;
  }

  ctx.save();
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.3;
  ctx.fillText(counterText, width - 16, height - 16);
  ctx.restore();
};

export const readingSlide: SlideModule = {
  id: 'reading',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/reading.json', {
        signal: withTimeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error('[Nucleus] Failed to fetch reading slide data:', response.status);
        return null;
      }
      return (await response.json()) as SlideData | null;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch reading data:', error);
      return null;
    }
  },

  render(ctx, width, height, frame, data, theme) {
    const accent = theme.accent;
    const renderData = (data?.renderData || {}) as ReadingRenderData;
    const state = ensureState(ctx, width, height, renderData.totalPages, renderData.chapterCount || 1, renderData.title || '');

    ctx.clearRect(0, 0, width, height);

    drawPullQuote(ctx, renderData.pullQuote || '', frame, width, height, accent);
    drawStreams(ctx, state, frame, width, accent, ['back']);
    drawChapterMarkers(ctx, renderData, width, height, accent);
    drawSpine(ctx, renderData.title || '', frame, height, accent);
    drawStreams(ctx, state, frame, width, accent, ['mid', 'front']);
    drawPageCount(ctx, renderData, frame, width, height, accent);
  }
};