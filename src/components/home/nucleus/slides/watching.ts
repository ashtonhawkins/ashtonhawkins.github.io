import type { SlideData, SlideModule } from '../types';

export interface RecentWatch {
  title: string;
  rating: number | null;
  genre: string | null;
  posterUrl: string | null;
}

export interface WatchingAggregateStats {
  filmsThisYear: number;
  lifetimeFilms: number;
  averageRating: number;
  topDecade: string;
  topGenres: string[];
  recentWatches: RecentWatch[];
}

export interface WatchingRenderData {
  type: 'film' | 'tv';
  title: string;
  year: number;
  rating: number | null;
  director: string | null;
  cast: string[];
  genres: string[];
  runtime: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  posterUrl?: string | null;
  watchedDate?: string;
  aggregate?: WatchingAggregateStats;
}

const TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", monospace';

const GENRE_COLORS: Record<string, string> = {
  romance: '#FF2D6B',
  drama: '#2D5BFF',
  thriller: '#FF8C00',
  comedy: '#FFD700',
  horror: '#00FF41',
  'sci-fi': '#00FFFF',
  scifi: '#00FFFF',
  action: '#FF0000',
  documentary: '#C4A882',
  mystery: '#A24BFF',
  fantasy: '#4d9cff',
  animation: '#ff5fb2',
  crime: '#f25f5c'
};

let introStartFrame = 0;
let frameInitialized = false;
let posterImage: HTMLImageElement | null = null;
let lastPosterUrl = '';
let posterFailed = false;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const animateIn = (elapsed: number, start: number, duration: number): number => clamp((elapsed - start) / Math.max(1, duration), 0, 1);

const parseColor = (input: string): [number, number, number] | null => {
  const hex = input.trim();
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return null;
  if (hex.length === 4) {
    return [
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16),
      Number.parseInt(hex[3] + hex[3], 16)
    ];
  }
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
};

const withAlpha = (color: string, alpha: number): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(alpha, 0, 1)})`;
};

const ensurePoster = (url?: string | null) => {
  if (!url || typeof Image === 'undefined') {
    posterImage = null;
    lastPosterUrl = '';
    return;
  }
  if (lastPosterUrl === url || posterFailed) return;
  lastPosterUrl = url;
  posterFailed = false;
  const next = new Image();
  next.onload = () => { posterImage = next; };
  next.onerror = () => { posterImage = null; posterFailed = true; };
  next.src = url;
};

const getGenrePalette = (genres: string[], fallback: string): string[] => {
  const mapped = genres
    .map((g) => GENRE_COLORS[g.toLowerCase()] ?? null)
    .filter((g): g is string => Boolean(g));
  return mapped.length ? mapped : [fallback, '#3d7090'];
};

const getPrimaryGenreColor = (genres: string[], fallback: string): string => getGenrePalette(genres, fallback)[0] ?? fallback;

const drawReactiveAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  genres: string[],
  rating: number | null,
  type: 'film' | 'tv',
  fallbackAccent: string
) => {
  const palette = getGenrePalette(genres, fallbackAccent);
  const intensity = clamp((rating ?? 3) / 5, 0.2, 1);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(3,6,10,0.98)');
  bg.addColorStop(1, 'rgba(5,8,13,0.96)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 3; i += 1) {
    const x = width * (0.2 + i * 0.33) + Math.sin(frame * 0.004 + i * 2.1) * 36;
    const y = height * (0.4 + i * 0.12) + Math.cos(frame * 0.003 + i * 1.3) * 28;
    const radius = Math.min(width, height) * (0.45 + i * 0.12);
    const cloud = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    cloud.addColorStop(0, withAlpha(palette[i % palette.length] ?? fallbackAccent, 0.2 * intensity));
    cloud.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.globalAlpha = type === 'film' ? 0.09 : 0.07;
  if (type === 'film') {
    for (let i = 0; i < 220; i += 1) {
      const x = ((i * 37 + frame * 2.1) % width + width) % width;
      const y = ((i * 71 + frame * 3.3) % height + height) % height;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(130,140,160,0.25)';
      ctx.fillRect(x, y, 1, 1);
    }
  } else {
    for (let y = 0; y < height; y += 3) {
      const alpha = 0.07 + Math.sin(y * 0.08 + frame * 0.05) * 0.02;
      ctx.fillStyle = `rgba(140,180,220,${alpha})`;
      ctx.fillRect(0, y, width, 1);
    }
  }
  ctx.restore();
};

const drawPosterGhost = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, elapsed: number) => {
  if (!posterImage) return;
  const alpha = animateIn(elapsed, 12, 36) * 0.16;
  const zoom = 1.1 + Math.sin(frame * 0.0028) * 0.03;
  const pw = width * zoom;
  const ph = height * zoom;
  const x = (width - pw) / 2 + Math.sin(frame * 0.003) * 8;
  const y = (height - ph) / 2 + Math.cos(frame * 0.0026) * 7;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = 'grayscale(0.82) saturate(0.5) blur(18px)';
  ctx.drawImage(posterImage, x, y, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
};

const drawYearWatermarkFilmstrip = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  year: number,
  filmsThisYear: number,
  accent: string,
  elapsed: number
) => {
  const text = String(year || new Date().getFullYear());
  const fontSize = width < 680 ? 64 : 108;
  const x = width * 0.28;
  const y = height * 0.56;
  const reveal = animateIn(elapsed, 16, 48);
  if (reveal <= 0) return;

  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.font = `700 ${fontSize}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = withAlpha(accent, 0.07);
  ctx.fillText(text, x, y);

  const m = ctx.measureText(text);
  const stripW = m.width * 0.92;
  const stripH = Math.max(20, fontSize * 0.24);
  const stripX = x - stripW / 2;
  const stripY = y - stripH * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(stripX, stripY, stripW, stripH);

  const maxFrames = 36;
  const filled = clamp(Math.round(filmsThisYear), 0, maxFrames);
  const frameW = stripW / maxFrames;
  const offset = (frame * 0.35) % frameW;

  for (let i = 0; i < maxFrames; i += 1) {
    const fx = stripX + i * frameW - offset;
    if (fx + frameW < stripX || fx > stripX + stripW) continue;
    const active = i < filled;
    ctx.fillStyle = active ? withAlpha(accent, 0.5) : 'rgba(255,255,255,0.08)';
    ctx.fillRect(fx + 1, stripY + 3, Math.max(0, frameW - 2), stripH - 6);
    ctx.fillStyle = active ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(fx + 1, stripY + 3, Math.max(0, frameW - 2), 3);
  }
  ctx.restore();
  ctx.restore();
};

const formatWatchLine = (renderData: WatchingRenderData): string => {
  if (renderData.type === 'tv') {
    const se = `S${String(renderData.season ?? 0).padStart(2, '0')} E${String(renderData.episode ?? 0).padStart(2, '0')}`;
    return `${se}${renderData.episodeTitle ? ` · "${renderData.episodeTitle}"` : ''}`;
  }
  return `${renderData.year || '----'} · ${renderData.type === 'film' ? 'feature' : 'series'} · ${renderData.runtime || 0}m`;
};

const drawTitleBlock = (
  ctx: CanvasRenderingContext2D,
  width: number,
  elapsed: number,
  frame: number,
  accent: string,
  renderData: WatchingRenderData
) => {
  const cardW = Math.min(420, width * 0.48);
  const x = width - cardW - 16;
  const y = 20;
  const reveal = animateIn(elapsed, 28, 40);
  if (reveal <= 0) return;

  const safeTitle = renderData.title || 'UNTITLED';
  const typed = safeTitle.slice(0, Math.max(1, Math.floor(safeTitle.length * animateIn(elapsed, 38, 70))));
  const runtimeRatio = clamp((renderData.runtime || 0) / 120, 0, 1);

  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = 'rgba(4,7,12,0.62)';
  ctx.strokeStyle = withAlpha(accent, 0.32);
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, cardW, 124);
  ctx.strokeRect(x, y, cardW, 124);

  ctx.fillStyle = withAlpha(accent, 0.26);
  ctx.fillRect(x + 10, y + 10, 58, 14);
  ctx.fillStyle = 'rgba(8,12,18,0.9)';
  ctx.font = `700 9px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(renderData.type === 'film' ? '🎬 FILM' : '📺 SERIES', x + 39, y + 17);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = withAlpha(accent, 0.95);
  ctx.font = `700 ${width < 700 ? 17 : 22}px ${MONO}`;
  ctx.fillText(typed, x + 12, y + 32);

  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.52);
  const cursorOn = Math.floor(frame / 18) % 2 === 0 ? '▌' : ' ';
  ctx.fillText(`${formatWatchLine(renderData)} ${cursorOn}`, x + 12, y + 61);

  const decade = `${Math.floor((renderData.year || new Date().getFullYear()) / 10) * 10}s`;
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.42);
  ctx.fillText(`${renderData.year || '----'} · ${decade}`, x + 12, y + 79);

  const watchedText = renderData.watchedDate ? `Watched ${new Date(renderData.watchedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Watched recently';
  ctx.fillStyle = withAlpha(accent, 0.34);
  ctx.fillText(watchedText, x + 12, y + 94);

  const barY = y + 108;
  const trackW = cardW - 24;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + 12, barY, trackW, 6);
  const fillW = trackW * runtimeRatio * animateIn(elapsed, 50, 60);
  ctx.fillStyle = withAlpha(accent, 0.55);
  ctx.fillRect(x + 12, barY, fillW, 6);
  ctx.fillStyle = withAlpha(accent, 0.85);
  ctx.fillRect(x + 12 + Math.max(0, fillW - 3), barY - 1, 3, 8);
  ctx.restore();
};

const drawGenreSystem = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  elapsed: number,
  genres: string[],
  fallbackAccent: string
) => {
  const showSimple = width < 620;
  const palette = getGenrePalette(genres, fallbackAccent);
  const items = genres.length ? genres : ['unclassified'];

  if (showSimple) {
    const y = 112;
    let x = 16;
    items.slice(0, 3).forEach((genre, index) => {
      const label = genre.toUpperCase();
      const w = clamp(label.length * 7 + 16, 54, 120);
      ctx.fillStyle = withAlpha(palette[index % palette.length] ?? fallbackAccent, 0.18);
      ctx.strokeStyle = withAlpha(palette[index % palette.length] ?? fallbackAccent, 0.5);
      ctx.beginPath();
      ctx.roundRect(x, y, w, 18, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = withAlpha(palette[index % palette.length] ?? fallbackAccent, 0.9);
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + 9);
      x += w + 6;
    });
    return;
  }

  const cx = width * 0.27;
  const cy = height * 0.53;
  items.slice(0, 4).forEach((genre, index) => {
    const ringProgress = animateIn(elapsed, 34 + index * 10, 70);
    const radius = 34 + index * 15;
    const speed = 0.003 + index * 0.0016;
    const start = frame * speed;
    const end = start + Math.PI * (1.2 + index * 0.1) * ringProgress;
    const color = palette[index % palette.length] ?? fallbackAccent;

    ctx.save();
    ctx.strokeStyle = withAlpha(color, index === 0 ? 0.9 : 0.46);
    ctx.lineWidth = index === 0 ? 2.6 : 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.stroke();

    const lx = cx + Math.cos(end) * radius;
    const ly = cy + Math.sin(end) * radius;
    ctx.fillStyle = withAlpha(color, 0.92);
    ctx.font = `${index === 0 ? '700 ' : ''}10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(genre.toUpperCase(), lx + 8, ly);
    ctx.restore();
  });
};

const drawRatingGauge = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  frame: number,
  accent: string,
  rating: number | null,
  avg: number
) => {
  const value = clamp(rating ?? 0, 0, 5);
  const x = width - 170;
  const y = height - 138;
  const reveal = animateIn(elapsed, 56, 60);
  if (reveal <= 0) return;

  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.5);
  ctx.fillText('SIGNAL', x, y - 8);

  for (let i = 0; i < 5; i += 1) {
    const bx = x + i * 14;
    const h = 12 + i * 6;
    const by = y + 36 - h;
    const amount = clamp(value - i, 0, 1);
    ctx.strokeStyle = withAlpha(accent, 0.28);
    ctx.strokeRect(bx, by, 10, h);
    if (amount > 0) {
      const pulse = 0.75 + Math.sin(frame * 0.05 + i) * 0.2;
      ctx.fillStyle = withAlpha(accent, (0.42 + 0.3 * pulse) * amount);
      ctx.fillRect(bx + 1, by + 1 + (1 - amount) * (h - 2), 8, (h - 2) * amount);
    }
  }

  ctx.fillStyle = withAlpha(accent, 0.92);
  ctx.font = `700 13px ${MONO}`;
  ctx.fillText(`${value.toFixed(1)} / 5`, x + 78, y + 6);
  const delta = value - avg;
  const arrow = delta >= 0 ? '↑' : '↓';
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.55);
  ctx.fillText(`avg: ${avg.toFixed(1)} ${arrow}${Math.abs(delta).toFixed(1)}`, x + 78, y + 21);
  ctx.restore();
};

const drawCastTicker = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  elapsed: number,
  cast: string[],
  runtime: number,
  accent: string
) => {
  if (!cast.length) return;
  const reveal = animateIn(elapsed, 80, 40);
  if (reveal <= 0) return;
  const names = cast.map((n) => n.toUpperCase());
  const row = `${names.join(' ◈ ')} ◈ `;
  const speed = 0.15 + clamp((180 - runtime) / 300, 0.08, 0.45);

  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.beginPath();
  ctx.rect(0, height - 42, width, 24);
  ctx.clip();

  ctx.font = `11px ${MONO}`;
  const rowWidth = Math.max(width, ctx.measureText(row).width + 40);
  const offset = (frame * speed) % rowWidth;

  for (let copy = -1; copy <= 1; copy += 1) {
    const baseX = width - offset + copy * rowWidth;
    let cursor = baseX;
    names.forEach((name, idx) => {
      const chipW = ctx.measureText(name).width + 20;
      const center = cursor + chipW * 0.5;
      const dist = Math.abs(center - width / 2) / (width / 2);
      const scale = clamp(1.06 - dist * 0.28, 0.78, 1.06);
      const alpha = clamp(0.82 - dist * 0.54, 0.2, 0.82);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(center, height - 30);
      ctx.scale(scale, scale);
      ctx.translate(-chipW / 2, -7);
      ctx.fillStyle = 'rgba(5,9,14,0.55)';
      ctx.strokeStyle = withAlpha(accent, 0.34);
      ctx.beginPath();
      ctx.roundRect(0, 0, chipW, 14, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = withAlpha(accent, 0.75);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, chipW / 2, 7);
      ctx.restore();

      cursor += chipW + 16;
      if (idx < names.length - 1) {
        ctx.fillStyle = withAlpha(accent, 0.6 * alpha);
        ctx.fillText('◈', cursor - 8, height - 23);
      }
    });
  }
  ctx.restore();
};

const drawAverageDial = (ctx: CanvasRenderingContext2D, x: number, y: number, value: number) => {
  const angle = Math.PI * 0.8 + (Math.PI * 1.4) * clamp(value / 5, 0, 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 16, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.strokeStyle = value >= 4 ? '#63ff9b' : value >= 3 ? '#ffd95d' : '#ff6b6b';
  ctx.beginPath();
  ctx.arc(x, y, 16, Math.PI * 0.8, angle);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
  ctx.stroke();
};

const drawDecadeHistogram = (ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, topDecade: string) => {
  const labels = ['60s', '70s', '80s', '90s', '00s', '10s', '20s'];
  labels.forEach((label, i) => {
    const h = 4 + ((i * 7 + 11) % 14);
    const active = topDecade.includes(label.slice(0, 2));
    ctx.strokeStyle = withAlpha(accent, active ? 0.8 : 0.24);
    ctx.strokeRect(x + i * 8, y - h, 5, h);
    if (active) {
      ctx.fillStyle = withAlpha(accent, 0.46);
      ctx.fillRect(x + i * 8 + 1, y - h + 1, 3, h - 2);
    }
  });
};

const drawStatsDashboard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  accent: string,
  aggregate: WatchingAggregateStats
) => {
  const reveal = animateIn(elapsed, 70, 65);
  if (reveal <= 0) return;

  const barH = 48;
  const y = height - barH;
  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = 'rgba(3,6,10,0.78)';
  ctx.fillRect(0, y, width, barH);
  ctx.strokeStyle = withAlpha(accent, 0.2);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  const colW = width / 5;
  const filmsAnimated = Math.round(aggregate.filmsThisYear * reveal);
  ctx.fillStyle = withAlpha(accent, 0.82);
  ctx.font = `700 13px ${MONO}`;
  ctx.fillText(String(filmsAnimated), 10, y + 16);
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.5);
  ctx.fillText(`${new Date().getFullYear()} films`, 10, y + 28);
  const tinyFrames = 12;
  for (let i = 0; i < tinyFrames; i += 1) {
    ctx.strokeStyle = withAlpha(accent, 0.25);
    ctx.strokeRect(10 + i * 6, y + 33, 4, 8);
    if (i < clamp(Math.round((aggregate.filmsThisYear / Math.max(1, new Date().getMonth() + 1)) * 2), 0, tinyFrames)) {
      ctx.fillStyle = withAlpha(accent, 0.45);
      ctx.fillRect(11 + i * 6, y + 34, 2, 6);
    }
  }

  const lifeAnimated = Math.round(aggregate.lifetimeFilms * reveal);
  ctx.fillStyle = withAlpha(accent, 0.8);
  ctx.font = `700 13px ${MONO}`;
  ctx.fillText(String(lifeAnimated), colW + 10, y + 16);
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.48);
  ctx.fillText('lifetime films', colW + 10, y + 28);
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const sx = colW + 10 + i * 4;
    const sy = y + 42 - Math.sin(i * 0.7) * 6 - (i % 4);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = withAlpha(accent, 0.38);
  ctx.stroke();

  drawAverageDial(ctx, colW * 2 + 28, y + 24, aggregate.averageRating);
  ctx.fillStyle = withAlpha(accent, 0.82);
  ctx.font = `700 12px ${MONO}`;
  ctx.fillText(`★ ${aggregate.averageRating.toFixed(1)}`, colW * 2 + 50, y + 20);

  ctx.fillStyle = withAlpha(accent, 0.8);
  ctx.font = `700 12px ${MONO}`;
  ctx.fillText(aggregate.topDecade || '----', colW * 3 + 10, y + 16);
  drawDecadeHistogram(ctx, colW * 3 + 10, y + 42, accent, aggregate.topDecade || '');

  ctx.font = `8px ${MONO}`;
  const recent = aggregate.recentWatches.slice(0, 5);
  recent.forEach((watch, i) => {
    const rx = colW * 4 + 8 + i * 22;
    const ry = y + 8;
    const indicator = watch.rating != null && watch.rating >= 4 ? '#63ff9b' : watch.rating != null && watch.rating >= 3 ? '#ffd95d' : '#ff6b6b';
    ctx.fillStyle = withAlpha(accent, 0.16);
    ctx.fillRect(rx, ry, 16, 24);
    ctx.strokeStyle = withAlpha(accent, 0.28);
    ctx.strokeRect(rx, ry, 16, 24);
    ctx.fillStyle = indicator;
    ctx.beginPath();
    ctx.arc(rx + 13, ry + 3, 2, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
};

const fallbackAggregate = (): WatchingAggregateStats => ({
  filmsThisYear: 0,
  lifetimeFilms: 0,
  averageRating: 0,
  topDecade: '----',
  topGenres: [],
  recentWatches: []
});

export const watchingSlide: SlideModule = {
  id: 'watching',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/watching.json');
      if (!response.ok) {
        console.error(`[Nucleus] Failed to fetch Watching slide data: ${response.status} ${response.statusText}`);
        return null;
      }
      return (await response.json()) as SlideData | null;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch Watching slide data.', error);
      return null;
    }
  },

  render(ctx, width, height, frame, data, theme) {
    if (!frameInitialized) {
      introStartFrame = frame;
      frameInitialized = true;
    }

    const elapsed = Math.max(0, frame - introStartFrame);
    const renderData = (data?.renderData || {}) as WatchingRenderData;
    const type = renderData.type === 'tv' ? 'tv' : 'film';
    const aggregate = renderData.aggregate ?? fallbackAggregate();
    const accent = getPrimaryGenreColor(renderData.genres || [], theme.accent);

    ensurePoster(renderData.posterUrl);

    ctx.clearRect(0, 0, width, height);
    drawReactiveAtmosphere(ctx, width, height, frame, renderData.genres || [], renderData.rating, type, accent);
    drawPosterGhost(ctx, width, height, frame, elapsed);
    drawYearWatermarkFilmstrip(ctx, width, height, frame, renderData.year || new Date().getFullYear(), aggregate.filmsThisYear, accent, elapsed);
    drawGenreSystem(ctx, width, height, frame, elapsed, renderData.genres || [], accent);
    drawTitleBlock(ctx, width, elapsed, frame, accent, renderData);
    drawRatingGauge(ctx, width, height, elapsed, frame, accent, renderData.rating, aggregate.averageRating || 0);
    drawCastTicker(ctx, width, height, frame, elapsed, renderData.cast || [], renderData.runtime || 0, accent);
    drawStatsDashboard(ctx, width, height, elapsed, accent, aggregate);
  },

  reset() {
    introStartFrame = 0;
    frameInitialized = false;
    posterImage = null;
    lastPosterUrl = '';
    posterFailed = false;
  }
};
