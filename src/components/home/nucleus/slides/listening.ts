const TAU = Math.PI * 2;
const MINI_BAR_COUNT = 10;
const EQ_BAR_COUNT = 10;
const EQ_BAR_WIDTH = 3;
const EQ_BAR_GAP = 2;
const BPM_FONT = '10px "IBM Plex Mono", monospace';
const GENRE_FONT = '32px "IBM Plex Mono", monospace';

export type ListeningRenderData = {
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  bpm: number;
  genre: string;
  duration: number;
  isNowPlaying: boolean;
};

export type SlideData = {
  accentOverride?: string;
  renderData: ListeningRenderData;
};

const clampBpm = (bpm: number): number => {
  if (!Number.isFinite(bpm) || bpm <= 0) return 120;
  return Math.min(240, Math.max(60, bpm));
};

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
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',');
    if (parts.length >= 3) {
      const r = Number.parseFloat(parts[0]);
      const g = Number.parseFloat(parts[1]);
      const b = Number.parseFloat(parts[2]);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
      }
    }
  }

  return null;
};

export const blendColors = (themeAccent: string, override: string, ratio = 0.3): string => {
  const baseRgb = parseColor(themeAccent);
  const overrideRgb = parseColor(override);
  if (!baseRgb || !overrideRgb) return themeAccent;

  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const inverse = 1 - clampedRatio;
  const r = Math.round(baseRgb[0] * inverse + overrideRgb[0] * clampedRatio);
  const g = Math.round(baseRgb[1] * inverse + overrideRgb[1] * clampedRatio);
  const b = Math.round(baseRgb[2] * inverse + overrideRgb[2] * clampedRatio);

  return `rgb(${r}, ${g}, ${b})`;
};

const simplex2D = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
};

const drawGenreTag = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, genre: string, accent: string): void => {
  ctx.font = GENRE_FONT;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.06;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(genre.toUpperCase(), width * 0.5 + Math.sin(frame * 0.0002) * 20, height * 0.35);
  ctx.globalAlpha = 1;
};

const drawBottomBars = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, accent: string): void => {
  const barGap = width / (MINI_BAR_COUNT + 1);
  const maxBarHeight = height * 0.35;
  const minBarHeight = height * 0.2;

  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < MINI_BAR_COUNT; i += 1) {
    const x = barGap * (i + 1) - EQ_BAR_WIDTH * 0.5;
    const barHeight = minBarHeight + Math.abs(Math.sin(frame * 0.002 + i * 1.3)) * (maxBarHeight - minBarHeight);
    ctx.fillRect(x, height - barHeight, EQ_BAR_WIDTH, barHeight);
  }
  ctx.globalAlpha = 1;
};

const drawWaveform = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  bpm: number,
  accent: string
): void => {
  const centerY = height * 0.5;
  const amplitude = height * 0.35;
  const normalized = clampBpm(bpm) / 120;
  const timePrimary = frame * 0.001 * normalized;
  const timeSecondary = frame * 0.0015 * normalized;

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    let y = 0;
    y += Math.sin(t * 6.28 * 2 * normalized + timePrimary) * 0.45;
    y += Math.sin(t * 6.28 * 3.7 * normalized + timeSecondary) * 0.25;
    y += Math.sin(t * 6.28 * 7.3 + frame * 0.0008) * 0.15;
    y += Math.sin(t * 6.28 * 1.1 + frame * 0.0005) * 0.5;
    y += simplex2D(t * 3 + frame * 0.0003, 0) * 0.12;
    const py = centerY + y * amplitude;
    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    let y = 0;
    y += Math.sin(t * 6.28 * 2 * normalized + timePrimary + 0.5) * 0.4;
    y += Math.sin(t * 6.28 * 3.7 * normalized + timeSecondary + 0.3) * 0.2;
    y += Math.sin(t * 6.28 * 7.3 + frame * 0.0008 + 0.7) * 0.15;
    y += Math.sin(t * 6.28 * 1.1 + frame * 0.0005 + 0.2) * 0.35;
    const py = centerY + y * (amplitude * 0.85) + 4;
    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const drawEqBars = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, bpm: number, accent: string): void => {
  const speed = frame * (clampBpm(bpm) / 120);
  const maxHeight = height * 0.4;
  const totalWidth = EQ_BAR_COUNT * EQ_BAR_WIDTH + (EQ_BAR_COUNT - 1) * EQ_BAR_GAP;
  const startX = width - 16 - totalWidth;
  const baseY = height - 24;

  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  for (let i = 0; i < EQ_BAR_COUNT; i += 1) {
    const barHeight = Math.abs(Math.sin(speed * 0.003 * (1 + i * 0.3) + i * 1.7)) * maxHeight;
    const x = startX + i * (EQ_BAR_WIDTH + EQ_BAR_GAP);
    const y = baseY - barHeight;

    ctx.globalAlpha = 0.2;
    ctx.fillRect(x, y, EQ_BAR_WIDTH, barHeight);
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(x + 0.5, y + 0.5, EQ_BAR_WIDTH - 1, Math.max(0, barHeight - 1));
  }
  ctx.globalAlpha = 1;
};

const drawBpmCounter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  frame: number,
  bpm: number,
  accent: string
): void => {
  const value = Math.round(clampBpm(bpm));
  const pulseCycle = (frame * (value / 60) * 0.001) % 1;
  const pulseAlpha = 0.25 + 0.15 * Math.sin(pulseCycle * TAU);

  ctx.font = BPM_FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = accent;
  ctx.globalAlpha = pulseAlpha;
  ctx.fillText(`${value} BPM`, width - 16, 16);
  ctx.globalAlpha = 1;
};

export const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  data: SlideData,
  theme: { accent: string; border: string }
): void => {
  const accent = data.accentOverride ? blendColors(theme.accent, data.accentOverride, 0.3) : theme.accent;
  const bpm = clampBpm(data.renderData.bpm);
  const genre = data.renderData.genre || 'unknown';

  ctx.clearRect(0, 0, width, height);

  drawGenreTag(ctx, width, height, frame, genre, accent);
  drawBottomBars(ctx, width, height, frame, accent);
  drawWaveform(ctx, width, height, frame, bpm, accent);
  drawEqBars(ctx, width, height, frame, bpm, accent);
  drawBpmCounter(ctx, width, frame, bpm, accent);
};
