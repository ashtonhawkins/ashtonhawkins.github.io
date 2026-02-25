import type { SlideData, SlideModule } from '../types';

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
}

type StatsData = {
  thisYearCount?: number;
  totalFilms?: number;
  avgRating?: number;
  topDecade?: string;
};

const TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", monospace';

let introStartFrame = 0;
let frameInitialized = false;
let letterboxdIcon: HTMLImageElement | null = null;
let iconLoadAttempted = false;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const parseColor = (input: string): [number, number, number] | null => {
  const color = input.trim();
  if (!color) return null;
  if (color[0] === '#') {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
      return [r, g, b];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
      return [r, g, b];
    }
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(',');
  if (parts.length < 3) return null;
  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
};

const withAlpha = (color: string, alpha: number): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${clamp(alpha, 0, 1)})`;
};

const blendColors = (base: string, overlay: string, ratio = 0.3): string => {
  const a = parseColor(base);
  const b = parseColor(overlay);
  if (!a || !b) return base;
  const mix = clamp(ratio, 0, 1);
  const inv = 1 - mix;
  return `rgb(${Math.round(a[0] * inv + b[0] * mix)}, ${Math.round(a[1] * inv + b[1] * mix)}, ${Math.round(a[2] * inv + b[2] * mix)})`;
};

const applyWarmthTint = (color: string, valence = 0.5): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const warmth = clamp(valence * 2 - 1, -1, 1);
  const influence = 0.15;
  const redShift = warmth > 0 ? 22 * warmth : 0;
  const amberShift = warmth > 0 ? 14 * warmth : 0;
  const blueShift = warmth < 0 ? 24 * Math.abs(warmth) : 0;
  const r = clamp(rgb[0] + (redShift - blueShift * 0.3) * influence, 0, 255);
  const g = clamp(rgb[1] + amberShift * influence, 0, 255);
  const bl = clamp(rgb[2] + (blueShift - redShift * 0.2) * influence, 0, 255);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)})`;
};

const animateIn = (elapsed: number, start: number, duration: number): number => {
  if (elapsed <= start) return 0;
  if (duration <= 0) return 1;
  return clamp((elapsed - start) / duration, 0, 1);
};

const loadIcon = (path: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  if (typeof Image === 'undefined') {
    resolve(null);
    return;
  }
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = path;
});

const ensureIconsLoaded = async (): Promise<void> => {
  if (iconLoadAttempted) return;
  iconLoadAttempted = true;
  letterboxdIcon = await loadIcon('/icons/letterboxd-mono.svg');
};

const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  type: 'film' | 'tv'
) => {
  const tint = type === 'film' ? 'rgba(160, 120, 70, 0.04)' : 'rgba(80, 100, 140, 0.04)';

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, withAlpha(accent, 0.015));
  gradient.addColorStop(1, tint);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  for (let i = 0; i < 150; i += 1) {
    const x = Math.floor((Math.sin(i * 13.37 + frame * 0.17) * 0.5 + 0.5) * width);
    const y = Math.floor((Math.cos(i * 9.11 + frame * 0.19) * 0.5 + 0.5) * height);
    ctx.fillStyle = type === 'film' ? 'rgba(190, 160, 120, 0.03)' : 'rgba(190, 200, 220, 0.03)';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.24, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
};

const drawCountdownLeader = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  accent: string,
  type: 'film' | 'tv'
) => {
  const cx = 50;
  const cy = 52;
  const radius = 24;

  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.22);
  ctx.lineWidth = 1;

  if (type === 'tv') {
    const pulse = (frame * 0.016) % 1;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, TAU);
    ctx.fillStyle = withAlpha(accent, 0.22 + 0.15 * (1 - pulse));
    ctx.fill();

    for (let i = 1; i <= 3; i += 1) {
      const grow = (pulse + i * 0.22) % 1;
      ctx.globalAlpha = (1 - grow) * 0.18;
      ctx.beginPath();
      ctx.arc(cx, cy, 7 + grow * 20, 0, TAU);
      ctx.stroke();
    }
  } else {
    const period = 180;
    const phase = frame % period;
    const sweep = (phase / period) * TAU;
    const count = 5 - Math.floor((phase / period) * 5);
    const spliceFlash = phase < 2 || phase === 36 || phase === 72 || phase === 108 || phase === 144;

    ctx.globalAlpha = spliceFlash ? 0.24 : 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();

    if (spliceFlash) {
      ctx.fillStyle = withAlpha(accent, 0.05);
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 7, cy);
    ctx.lineTo(cx + radius + 7, cy);
    ctx.moveTo(cx, cy - radius - 7);
    ctx.lineTo(cx, cy + radius + 7);
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep - Math.PI / 2) * radius, cy + Math.sin(sweep - Math.PI / 2) * radius);
    ctx.stroke();

    ctx.font = `bold 18px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = withAlpha(accent, 0.16);
    const jitterX = ((frame * 31) % 3) - 1;
    const jitterY = ((frame * 17) % 3) - 1;
    ctx.fillText(String(Math.max(1, count)), cx + jitterX, cy + jitterY);
  }
  ctx.restore();
};

const drawYearStamp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  year: number
) => {
  const text = String(year || new Date().getFullYear());
  const fontSize = width < 420 ? 54 : 90;
  const baseX = width * 0.32 + Math.sin(frame * 0.004) * 8;
  const baseY = height * 0.56 + Math.sin(frame * 0.003) * 2;

  ctx.save();
  ctx.font = `bold ${fontSize}px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const x = baseX + (i - (text.length - 1) / 2) * fontSize * 0.65;
    const y = baseY + ((frame + i * 23) % 3) - 1;
    ctx.fillText(ch, x, y);
  }

  const scratchY = baseY + Math.sin(frame * 0.01) * 8;
  ctx.strokeStyle = withAlpha(accent, 0.05);
  ctx.beginPath();
  ctx.moveTo(0, scratchY);
  ctx.lineTo(width, scratchY);
  ctx.stroke();
  ctx.restore();
};

const drawTitleCard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  elapsed: number,
  accent: string,
  renderData: WatchingRenderData
) => {
  const cardW = Math.min(280, width * 0.55);
  const cardH = 92;
  const x = width - cardW - 14;
  const y = 16;

  const borderProgress = animateIn(elapsed, 18, 24);
  const titleProgress = animateIn(elapsed, 30, 60);
  const line1Progress = animateIn(elapsed, 48, 24);
  const line2Progress = animateIn(elapsed, 60, 24);

  ctx.save();
  ctx.globalAlpha = borderProgress;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(x, y, cardW, cardH);
  ctx.strokeStyle = withAlpha(accent, 0.15);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, cardW, cardH);

  const badge = renderData.type === 'film' ? 'FILM' : 'SERIES';
  ctx.fillStyle = withAlpha(accent, 0.25);
  ctx.fillRect(x + 8, y - 5, 42, 10);
  ctx.fillStyle = 'rgba(5, 6, 8, 0.8)';
  ctx.font = `7px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, x + 29, y);

  ctx.globalAlpha = borderProgress;
  ctx.fillStyle = withAlpha(accent, 0.28);
  ctx.fillRect(x + 10, y + 21, 10, 8);
  ctx.strokeStyle = withAlpha(accent, 0.22);
  ctx.strokeRect(x + 9, y + 20, 12, 10);

  const safeTitle = renderData.title || 'UNTITLED';
  const typeCount = Math.max(1, Math.ceil(safeTitle.length * titleProgress));
  const typedTitle = safeTitle.slice(0, typeCount);

  ctx.globalAlpha = 1;
  ctx.fillStyle = withAlpha(accent, 0.55);
  ctx.font = `13px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(typedTitle, x + 28, y + 18);

  const genreLine = (renderData.genres || []).slice(0, 2).join(', ');
  const line1 = renderData.type === 'film'
    ? `${renderData.year || '----'}${genreLine ? ` · ${genreLine}` : ''}`
    : `S${String(renderData.season || 0).padStart(2, '0')} E${String(renderData.episode || 0).padStart(2, '0')}${renderData.episodeTitle ? ` · "${renderData.episodeTitle}"` : ''}`;
  const line2 = renderData.type === 'film'
    ? `${renderData.director ? `Dir. ${renderData.director} · ` : ''}${renderData.runtime || 0} min`
    : `${genreLine || 'unclassified'} · ${renderData.runtime || 0} min`;

  ctx.fillStyle = withAlpha(accent, 0.25);
  ctx.globalAlpha = line1Progress;
  ctx.font = `9px ${MONO}`;
  ctx.fillText(line1, x + 28, y + 40);

  ctx.fillStyle = withAlpha(accent, 0.2);
  ctx.globalAlpha = line2Progress;
  ctx.fillText(line2, x + 28, y + 55);
  ctx.restore();
};

const drawGenrePills = (
  ctx: CanvasRenderingContext2D,
  width: number,
  elapsed: number,
  accent: string,
  genres: string[],
  type: 'film' | 'tv'
) => {
  const startX = width - Math.min(280, width * 0.55) - 14;
  const y = 114;
  const pills = genres.slice(0, 3);
  if (!pills.length) return;

  pills.forEach((genre, index) => {
    const reveal = animateIn(elapsed, 36 + index * 12, 18);
    if (reveal <= 0) return;
    const w = Math.max(44, Math.min(92, genre.length * 6 + 18));
    const x = startX + index * (w + 6);
    const glow = type === 'film' ? 'rgba(182, 132, 82, 0.08)' : 'rgba(98, 130, 180, 0.08)';

    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.fillStyle = glow;
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 14, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = withAlpha(accent, 0.2);
    ctx.font = `8px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(genre.toUpperCase(), x + w / 2, y + 7);
    ctx.restore();
  });
};

const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
  const inner = radius * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const outerAngle = -Math.PI / 2 + (i * TAU) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    const ox = cx + Math.cos(outerAngle) * radius;
    const oy = cy + Math.sin(outerAngle) * radius;
    const ix = cx + Math.cos(innerAngle) * inner;
    const iy = cy + Math.sin(innerAngle) * inner;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
};

const drawRating = (
  ctx: CanvasRenderingContext2D,
  height: number,
  elapsed: number,
  accent: string,
  type: 'film' | 'tv',
  rating: number | null
) => {
  if (rating == null) return;
  const normalized = type === 'tv' ? rating / 2 : rating;
  const value = clamp(normalized, 0, 5);
  const outlineProgress = animateIn(elapsed, 60, 30);
  const fillProgress = animateIn(elapsed, 78, 15);

  const x = 16;
  const y = height - 56;

  ctx.save();
  ctx.globalAlpha = outlineProgress;
  ctx.fillStyle = withAlpha(accent, 0.1);
  ctx.font = `6px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('RATING', x, y - 10);

  for (let i = 0; i < 5; i += 1) {
    const cx = x + i * 13 + 5;
    const cy = y;
    ctx.strokeStyle = withAlpha(accent, 0.08);
    drawStar(ctx, cx, cy, 5);
    ctx.stroke();

    const fillAmt = clamp(value - i, 0, 1);
    if (fillAmt <= 0 || fillProgress <= 0) continue;

    ctx.save();
    drawStar(ctx, cx, cy, 5);
    ctx.clip();
    ctx.fillStyle = withAlpha(accent, 0.4);
    ctx.globalAlpha = fillProgress;
    ctx.fillRect(cx - 5, cy - 5, 10 * fillAmt, 10);
    ctx.restore();
  }
  ctx.restore();
};

const drawRuntimeArc = (
  ctx: CanvasRenderingContext2D,
  height: number,
  elapsed: number,
  accent: string,
  runtime: number
) => {
  const cx = 74;
  const cy = height - 86;
  const radius = 30;
  const start = Math.PI * 0.8;
  const end = Math.PI * 2.2;
  const ratio = clamp((runtime || 0) / 120, 0, 1);
  const progress = animateIn(elapsed, 60, 90);
  const sweep = start + (end - start) * ratio * progress;

  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.1);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.stroke();

  ctx.strokeStyle = withAlpha(accent, 0.34);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, sweep);
  ctx.stroke();

  for (let min = 0; min <= 120; min += 30) {
    const a = start + (end - start) * (min / 120);
    const x0 = cx + Math.cos(a) * (radius - 3);
    const y0 = cy + Math.sin(a) * (radius - 3);
    const x1 = cx + Math.cos(a) * (radius + 3);
    const y1 = cy + Math.sin(a) * (radius + 3);
    ctx.strokeStyle = withAlpha(accent, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  const pulse = 0.65 + Math.sin(elapsed * 0.09) * 0.35;
  const dotX = cx + Math.cos(sweep) * radius;
  const dotY = cy + Math.sin(sweep) * radius;
  ctx.fillStyle = withAlpha(accent, 0.45 * pulse);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 2.2, 0, TAU);
  ctx.fill();

  ctx.fillStyle = withAlpha(accent, 0.1);
  ctx.font = `6px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('RUNTIME', cx, cy - radius - 8);
  ctx.fillStyle = withAlpha(accent, 0.25);
  ctx.font = `10px ${MONO}`;
  ctx.fillText(String(runtime || 0), cx, cy + 2);
  ctx.font = `6px ${MONO}`;
  ctx.fillText('MIN', cx, cy + 11);
  ctx.restore();
};

const drawCreditsRibbon = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  cast: string[],
  director: string | null
) => {
  const people = cast.filter(Boolean).map((name) => name.toUpperCase());
  if (!people.length && !director) return;
  const prefix = director ? `DIRECTED BY ${director.toUpperCase()} · ` : '';
  const text = `${prefix}${people.join(' · ')} · `;
  const repeated = text.repeat(3);
  const speed = frame * 0.3;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, height - 16, width, 14);
  ctx.clip();

  const x = width - (speed % (ctx.measureText(text).width || width));
  ctx.font = `8px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = withAlpha(accent, 0.18);
  ctx.fillText(repeated, x - width, height - 9);
  ctx.fillText(repeated, x, height - 9);

  const fadeL = ctx.createLinearGradient(0, 0, 24, 0);
  fadeL.addColorStop(0, 'rgba(0,0,0,0.5)');
  fadeL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fadeL;
  ctx.fillRect(0, height - 16, 24, 14);

  const fadeR = ctx.createLinearGradient(width - 24, 0, width, 0);
  fadeR.addColorStop(0, 'rgba(0,0,0,0)');
  fadeR.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = fadeR;
  ctx.fillRect(width - 24, height - 16, 24, 14);

  ctx.restore();
};

const drawStatsHud = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  accent: string,
  stats: StatsData | null
) => {
  if (!stats) return;
  const x = width - 136;
  const y = height - 70;
  const w = 122;
  const h = 54;
  const fade = animateIn(elapsed, 90, 24);
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = withAlpha(accent, 0.1);
  ctx.strokeRect(x, y, w, h);

  ctx.font = `6px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.12);
  ctx.fillText('◉ VIEWING STATS', x + 6, y + 8);

  const count = Number(stats.thisYearCount || 0);
  const barH = clamp(count, 0, 60) / 60 * 20;
  ctx.fillStyle = withAlpha(accent, 0.18);
  ctx.fillRect(x + 8, y + 34 - barH, 10, barH);
  ctx.fillStyle = withAlpha(accent, 0.22);
  ctx.font = `7px ${MONO}`;
  ctx.fillText(String(count), x + 10, y + 42);

  const avg = clamp(Number(stats.avgRating || 0), 0, 5);
  for (let i = 0; i < 5; i += 1) {
    const cx = x + 34 + i * 10;
    const cy = y + 24;
    ctx.strokeStyle = withAlpha(accent, 0.08);
    drawStar(ctx, cx, cy, 3);
    ctx.stroke();
    const fill = clamp(avg - i, 0, 1);
    if (fill > 0) {
      ctx.save();
      drawStar(ctx, cx, cy, 3);
      ctx.clip();
      ctx.fillStyle = withAlpha(accent, 0.22);
      ctx.fillRect(cx - 3, cy - 3, 6 * fill, 6);
      ctx.restore();
    }
  }

  if (stats.topDecade) {
    const label = `[${stats.topDecade}]`;
    const pillW = Math.min(56, Math.max(36, label.length * 5 + 8));
    const px = x + w - pillW - 8;
    const py = y + 34;
    ctx.fillStyle = withAlpha(accent, 0.07);
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.beginPath();
    ctx.roundRect(px, py, pillW, 12, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = withAlpha(accent, 0.2);
    ctx.font = `7px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + pillW / 2, py + 6);
  }

  ctx.restore();
};

const drawServiceLogo = (
  ctx: CanvasRenderingContext2D,
  height: number,
  elapsed: number,
  accent: string,
  type: 'film' | 'tv'
) => {
  const fade = animateIn(elapsed, 90, 24);
  if (fade <= 0) return;

  const y = height - 22;
  ctx.save();
  ctx.globalAlpha = fade;
  const pulse = 0.14 + (Math.sin(elapsed * 0.1) * 0.5 + 0.5) * 0.1;

  if (letterboxdIcon) {
    ctx.globalAlpha = type === 'film' ? pulse + 0.12 : 0.08;
    ctx.drawImage(letterboxdIcon, 16, y, 14, 14);
  } else {
    ctx.fillStyle = withAlpha(accent, type === 'film' ? 0.2 : 0.08);
    ctx.fillRect(16, y, 14, 14);
    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.font = `9px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', 23, y + 7);
  }

  ctx.globalAlpha = type === 'tv' ? pulse + 0.12 : 0.08;
  ctx.strokeStyle = withAlpha(accent, type === 'tv' ? 0.2 : 0.08);
  ctx.strokeRect(36, y, 14, 14);
  ctx.fillStyle = withAlpha(accent, type === 'tv' ? 0.2 : 0.08);
  ctx.font = `9px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', 43, y + 7);

  ctx.restore();
};

const getStatsData = (): StatsData | null => {
  if (typeof window === 'undefined') return null;
  const stats = (window as Window & { __nucleusWatchingData?: StatsData }).__nucleusWatchingData;
  if (!stats || typeof stats !== 'object') return null;
  return stats;
};

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
      void ensureIconsLoaded();
    }

    const elapsed = Math.max(0, frame - introStartFrame);
    const renderData = (data?.renderData || {}) as WatchingRenderData;
    const type = renderData.type === 'tv' ? 'tv' : 'film';

    const tempAccent = applyWarmthTint(theme.accent, type === 'film' ? 0.7 : 0.3);
    const atmosphereAccent = blendColors(tempAccent, type === 'film' ? '#8a6d43' : '#5f7294', 0.3);

    ctx.clearRect(0, 0, width, height);

    drawAtmosphere(ctx, width, height, frame, atmosphereAccent, type);
    drawCountdownLeader(ctx, frame, atmosphereAccent, type);
    drawYearStamp(ctx, width, height, frame, atmosphereAccent, renderData.year || new Date().getFullYear());
    drawCreditsRibbon(ctx, width, height, frame, atmosphereAccent, renderData.cast || [], renderData.director || null);

    drawTitleCard(ctx, width, elapsed, atmosphereAccent, renderData);
    drawGenrePills(ctx, width, elapsed, atmosphereAccent, renderData.genres || [], type);
    drawRating(ctx, height, elapsed, atmosphereAccent, type, renderData.rating);
    drawRuntimeArc(ctx, height, elapsed, atmosphereAccent, renderData.runtime || 0);
    drawStatsHud(ctx, width, height, elapsed, atmosphereAccent, getStatsData());
    drawServiceLogo(ctx, height, elapsed, atmosphereAccent, type);
  },

  reset() {
    introStartFrame = 0;
    frameInitialized = false;
  },
};
