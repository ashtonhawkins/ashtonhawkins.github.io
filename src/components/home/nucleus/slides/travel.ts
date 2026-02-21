import type { SlideData, SlideModule } from '../types';
import { LANDMARKS, getSkyline, loadTravelData } from '@lib/travel';

export type TravelRenderData = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  date: string;
  landmarkName: string;
  landmarkPath: string;
  skylineProfile: [number, number][];
};

type ParsedPath = {
  commands: Array<{ type: string; values: number[] }>;
  length: number;
};

const PATH_CACHE = new Map<string, ParsedPath>();
const DEFAULT_LANDMARK_PATH = 'M20 85 L50 15 L80 85 L68 85 L60 65 L40 65 L32 85 Z';

let revealStart: number | null = null;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutQuad = (t: number): number => 1 - (1 - clamp01(t)) ** 2;

const pseudoRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
};

const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.hypot(x2 - x1, y2 - y1);
};

const cubicPoint = (
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): [number, number] => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return [
    mt2 * mt * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t2 * t * p3[0],
    mt2 * mt * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t2 * t * p3[1],
  ];
};

const quadraticPoint = (
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
): [number, number] => {
  const mt = 1 - t;
  return [mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0], mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]];
};

const approximateCurveLength = (
  sampleCount: number,
  pointAt: (t: number) => [number, number],
): number => {
  let length = 0;
  let prev = pointAt(0);
  for (let i = 1; i <= sampleCount; i += 1) {
    const next = pointAt(i / sampleCount);
    length += distance(prev[0], prev[1], next[0], next[1]);
    prev = next;
  }
  return length;
};

const parsePath = (pathData: string): ParsedPath => {
  const cached = PATH_CACHE.get(pathData);
  if (cached) return cached;

  const normalized = pathData.trim() || DEFAULT_LANDMARK_PATH;
  const tokens = normalized.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];

  let index = 0;
  let command = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let length = 0;
  const commands: ParsedPath['commands'] = [];

  const read = (): number => Number(tokens[index++]);
  const hasNextNumber = (): boolean => index < tokens.length && !/^[a-zA-Z]$/.test(tokens[index]);

  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) {
      command = tokens[index++];
    }
    if (!command) continue;

    const relative = command === command.toLowerCase();
    const type = command.toUpperCase();

    if (type === 'M') {
      const xVal = read();
      const yVal = read();
      x = relative ? x + xVal : xVal;
      y = relative ? y + yVal : yVal;
      startX = x;
      startY = y;
      commands.push({ type: 'M', values: [x, y] });

      while (hasNextNumber()) {
        const lx = read();
        const ly = read();
        const nextX = relative ? x + lx : lx;
        const nextY = relative ? y + ly : ly;
        length += distance(x, y, nextX, nextY);
        commands.push({ type: 'L', values: [nextX, nextY] });
        x = nextX;
        y = nextY;
      }
      continue;
    }

    if (type === 'L') {
      while (hasNextNumber()) {
        const lx = read();
        const ly = read();
        const nextX = relative ? x + lx : lx;
        const nextY = relative ? y + ly : ly;
        length += distance(x, y, nextX, nextY);
        commands.push({ type: 'L', values: [nextX, nextY] });
        x = nextX;
        y = nextY;
      }
      continue;
    }

    if (type === 'H') {
      while (hasNextNumber()) {
        const hx = read();
        const nextX = relative ? x + hx : hx;
        length += distance(x, y, nextX, y);
        commands.push({ type: 'L', values: [nextX, y] });
        x = nextX;
      }
      continue;
    }

    if (type === 'V') {
      while (hasNextNumber()) {
        const vy = read();
        const nextY = relative ? y + vy : vy;
        length += distance(x, y, x, nextY);
        commands.push({ type: 'L', values: [x, nextY] });
        y = nextY;
      }
      continue;
    }

    if (type === 'C') {
      while (hasNextNumber()) {
        const x1v = read();
        const y1v = read();
        const x2v = read();
        const y2v = read();
        const xv = read();
        const yv = read();
        const x1 = relative ? x + x1v : x1v;
        const y1 = relative ? y + y1v : y1v;
        const x2 = relative ? x + x2v : x2v;
        const y2 = relative ? y + y2v : y2v;
        const nextX = relative ? x + xv : xv;
        const nextY = relative ? y + yv : yv;
        length += approximateCurveLength(24, (t) => cubicPoint(t, [x, y], [x1, y1], [x2, y2], [nextX, nextY]));
        commands.push({ type: 'C', values: [x1, y1, x2, y2, nextX, nextY] });
        x = nextX;
        y = nextY;
      }
      continue;
    }

    if (type === 'Q') {
      while (hasNextNumber()) {
        const x1v = read();
        const y1v = read();
        const xv = read();
        const yv = read();
        const x1 = relative ? x + x1v : x1v;
        const y1 = relative ? y + y1v : y1v;
        const nextX = relative ? x + xv : xv;
        const nextY = relative ? y + yv : yv;
        length += approximateCurveLength(18, (t) => quadraticPoint(t, [x, y], [x1, y1], [nextX, nextY]));
        commands.push({ type: 'Q', values: [x1, y1, nextX, nextY] });
        x = nextX;
        y = nextY;
      }
      continue;
    }

    if (type === 'A') {
      while (hasNextNumber()) {
        read();
        read();
        read();
        read();
        read();
        const xv = read();
        const yv = read();
        const nextX = relative ? x + xv : xv;
        const nextY = relative ? y + yv : yv;
        length += distance(x, y, nextX, nextY);
        commands.push({ type: 'L', values: [nextX, nextY] });
        x = nextX;
        y = nextY;
      }
      continue;
    }

    if (type === 'Z') {
      length += distance(x, y, startX, startY);
      commands.push({ type: 'Z', values: [] });
      x = startX;
      y = startY;
      continue;
    }
  }

  const parsed = { commands, length };
  PATH_CACHE.set(pathData, parsed);
  return parsed;
};

const drawParsedPath = (
  ctx: CanvasRenderingContext2D,
  parsed: ParsedPath,
  offsetX: number,
  offsetY: number,
  scale: number,
): void => {
  ctx.beginPath();
  for (const command of parsed.commands) {
    if (command.type === 'M') {
      ctx.moveTo(offsetX + command.values[0] * scale, offsetY + command.values[1] * scale);
    } else if (command.type === 'L') {
      ctx.lineTo(offsetX + command.values[0] * scale, offsetY + command.values[1] * scale);
    } else if (command.type === 'C') {
      ctx.bezierCurveTo(
        offsetX + command.values[0] * scale,
        offsetY + command.values[1] * scale,
        offsetX + command.values[2] * scale,
        offsetY + command.values[3] * scale,
        offsetX + command.values[4] * scale,
        offsetY + command.values[5] * scale,
      );
    } else if (command.type === 'Q') {
      ctx.quadraticCurveTo(
        offsetX + command.values[0] * scale,
        offsetY + command.values[1] * scale,
        offsetX + command.values[2] * scale,
        offsetY + command.values[3] * scale,
      );
    } else if (command.type === 'Z') {
      ctx.closePath();
    }
  }
};

const scrambleDigits = (text: string, progress: number, timeMs: number): string => {
  const revealCount = Math.floor(clamp01(progress) * text.length);
  let out = '';

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (i < revealCount || !/\d/.test(char)) {
      out += char;
      continue;
    }
    const digit = Math.floor(pseudoRandom(timeMs * 0.045 + i * 7.13) * 10);
    out += String(digit);
  }

  return out;
};

const formatStampDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate.toUpperCase();

  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
};

const drawSkyline = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skylineProfile: [number, number][],
  accentRgb: string,
  timeMs: number,
): void => {
  if (!skylineProfile.length) return;

  const barWidth = Math.max(6, (width / skylineProfile.length) * 0.8);
  const tallestThreshold = 50;

  for (let i = 0; i < skylineProfile.length; i += 1) {
    const [xPct, hPct] = skylineProfile[i];
    const x = (xPct / 100) * width;
    const barHeight = (hPct / 100) * (height * 0.35);

    ctx.fillStyle = `rgba(${accentRgb}, 0.06)`;
    ctx.strokeStyle = `rgba(${accentRgb}, 0.12)`;
    ctx.lineWidth = 1;
    ctx.fillRect(x - barWidth / 2, height - barHeight, barWidth, barHeight);
    ctx.strokeRect(x - barWidth / 2, height - barHeight, barWidth, barHeight);

    if (hPct <= tallestThreshold) continue;

    const dots = 2 + Math.floor(pseudoRandom(i * 19.1) * 2);
    for (let dot = 0; dot < dots; dot += 1) {
      const dotX = x - barWidth / 2 + 2 + pseudoRandom(i * 23.7 + dot * 11.3) * Math.max(2, barWidth - 4);
      const dotY = height - barHeight + 2 + pseudoRandom(i * 17.9 + dot * 5.6) * Math.max(2, barHeight - 4);
      const alpha = 0.1 + pseudoRandom(timeMs * 0.03 + i * 13.7 + dot * 7.1) * 0.15;
      ctx.fillStyle = `rgba(${accentRgb}, ${alpha.toFixed(3)})`;
      ctx.fillRect(dotX, dotY, 1, 1);
    }
  }
};

const drawStamp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: TravelRenderData,
  accentRgb: string,
  elapsedMs: number,
): void => {
  const centerX = width * 0.22;
  const centerY = height * 0.4;
  const stampW = 160;
  const stampH = 80;
  const fade = easeOutQuad(elapsedMs / 2000);
  const scale = 1 + 0.1 * (1 - easeOutCubic(elapsedMs / 1000));

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.globalAlpha = fade;

  const x = centerX - stampW / 2;
  const y = centerY - stampH / 2;
  const radius = 4;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + stampW - radius, y);
  ctx.quadraticCurveTo(x + stampW, y, x + stampW, y + radius);
  ctx.lineTo(x + stampW, y + stampH - radius);
  ctx.quadraticCurveTo(x + stampW, y + stampH, x + stampW - radius, y + stampH);
  ctx.lineTo(x + radius, y + stampH);
  ctx.quadraticCurveTo(x, y + stampH, x, y + stampH - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);

  ctx.strokeStyle = `rgba(${accentRgb}, 0.1)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgba(${accentRgb}, 0.18)`;
  ctx.font = '700 14px "IBM Plex Mono", monospace';
  ctx.fillText(data.city.toUpperCase(), x + 12, y + 12);

  ctx.fillStyle = `rgba(${accentRgb}, 0.12)`;
  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText(data.country.toUpperCase(), x + 12, y + 36);

  ctx.fillStyle = `rgba(${accentRgb}, 0.1)`;
  ctx.font = '400 8px "IBM Plex Mono", monospace';
  ctx.fillText(formatStampDate(data.date), x + 12, y + 54);

  ctx.restore();
};

const drawLandmark = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarkPath: string,
  accentRgb: string,
  elapsedMs: number,
): void => {
  const parsed = parsePath(landmarkPath || DEFAULT_LANDMARK_PATH);
  if (!parsed.commands.length) return;

  const targetWidth = width * 0.5;
  const targetHeight = height * 0.7;
  const scale = Math.min(targetWidth / 100, targetHeight / 100);
  const offsetX = width / 2 - 50 * scale;
  const offsetY = height / 2 - 50 * scale;

  const revealProgress = easeOutCubic(elapsedMs / 3000);
  const totalLength = Math.max(1, parsed.length * scale);

  ctx.save();
  ctx.strokeStyle = `rgba(${accentRgb}, 0.6)`;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([totalLength]);
  ctx.lineDashOffset = totalLength * (1 - revealProgress);

  if (revealProgress >= 0.99) {
    ctx.shadowBlur = 3;
    ctx.shadowColor = `rgba(${accentRgb}, 0.45)`;
  }

  drawParsedPath(ctx, parsed, offsetX, offsetY, scale);
  ctx.stroke();
  ctx.restore();
};

const drawCrosshair = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: TravelRenderData,
  accentRgb: string,
  elapsedMs: number,
): void => {
  const x = width * 0.78;
  const y = height * 0.25;

  ctx.save();
  ctx.strokeStyle = `rgba(${accentRgb}, 0.1)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${accentRgb}, 0.06)`;
  ctx.beginPath();
  ctx.arc(x, y, 35, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${accentRgb}, 0.12)`;
  ctx.beginPath();
  ctx.moveTo(x - 25, y);
  ctx.lineTo(x + 25, y);
  ctx.moveTo(x, y - 25);
  ctx.lineTo(x, y + 25);
  ctx.stroke();

  const latHemisphere = data.latitude >= 0 ? 'N' : 'S';
  const lngHemisphere = data.longitude >= 0 ? 'E' : 'W';
  const latText = `${Math.abs(data.latitude).toFixed(4)}°${latHemisphere}`;
  const lngText = `${Math.abs(data.longitude).toFixed(4)}°${lngHemisphere}`;

  const scrambleProgress = clamp01(elapsedMs / 1500);

  ctx.fillStyle = `rgba(${accentRgb}, 0.3)`;
  ctx.textBaseline = 'top';
  ctx.font = '400 9px "IBM Plex Mono", monospace';
  ctx.fillText(scrambleDigits(latText, scrambleProgress, elapsedMs), x - 30, y + 44);
  ctx.fillText(scrambleDigits(lngText, scrambleProgress, elapsedMs + 240), x - 30, y + 57);

  ctx.restore();
};

// Helper to extract RGB values from theme accent for rgba() usage
const toRgbString = (color: string): string => {
  if (color.startsWith('rgb(')) {
    return color.replace(/rgb\(([^)]+)\)/, '$1');
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '194, 233, 255'; // fallback
};

export const travelSlide: SlideModule = {
  id: 'travel',

  async fetchData(): Promise<SlideData | null> {
    try {
      const travelData = await loadTravelData();
      const trip = travelData?.lastTrip;
      if (!trip) {
        return null;
      }
      const landmark = LANDMARKS[trip.landmark] ?? LANDMARKS.default;
      const skyline = getSkyline(trip.destination.city);
      return {
        label: 'TRAVEL',
        detail: `${trip.destination.city} – ${trip.destination.country}`,
        link: '#travel',
        updatedAt: trip.date,
        renderData: {
          city: trip.destination.city,
          country: trip.destination.country,
          latitude: trip.destination.latitude,
          longitude: trip.destination.longitude,
          date: trip.date,
          landmarkName: landmark.name,
          landmarkPath: landmark.path,
          skylineProfile: skyline,
        },
      };
    } catch (error) {
      console.error('[Nucleus] Failed to fetch travel data:', error);
      return null;
    }
  },

  reset(): void {
    revealStart = null;
  },

  render(ctx, width, height, _frame, data, theme) {
    if (revealStart === null) revealStart = performance.now();
    const elapsedMs = performance.now() - revealStart;
    const renderData = (data?.renderData || {}) as TravelRenderData;
    const accentRgb = toRgbString(theme.accent);

    ctx.clearRect(0, 0, width, height);

    drawSkyline(ctx, width, height, renderData.skylineProfile || [], accentRgb, elapsedMs);
    drawStamp(ctx, width, height, renderData, accentRgb, elapsedMs);
    drawLandmark(ctx, width, height, renderData.landmarkPath || DEFAULT_LANDMARK_PATH, accentRgb, elapsedMs);
    drawCrosshair(ctx, width, height, renderData, accentRgb, elapsedMs);
  }
};