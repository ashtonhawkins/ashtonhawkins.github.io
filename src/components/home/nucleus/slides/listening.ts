import type { SlideData, SlideModule } from '../types';
import {
  estimateBpmFromGenre,
  extractDominantColor,
  getRecentTrack,
  getTrackInfo,
} from '@lib/lastfm';

const TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", monospace';
const ARC_COLORS = [
  'rgba(200, 160, 80, 0.3)',
  'rgba(80, 180, 160, 0.3)',
  'rgba(180, 100, 120, 0.3)',
  'rgba(100, 140, 200, 0.3)',
  'rgba(200, 200, 200, 0.2)',
];

type MoodMetrics = {
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  tempo: number;
};

type TrackFeatures = {
  id?: string;
  energy?: number;
  valence?: number;
  danceability?: number;
  duration_ms?: number;
  tempo?: number;
  acousticness?: number;
};

type SpotifyTrackRef = {
  id?: string;
  progressMs?: number;
  durationMs?: number;
  albumArt?: string;
  playedAt?: string;
};

type SpotifyProfile = {
  currentTrack?: SpotifyTrackRef | null;
  lastPlayed?: SpotifyTrackRef | null;
  mood?: MoodMetrics | null;
  topGenres?: Array<{ genre: string; count: number }>;
};

type RecentFeature = {
  energy: number;
  valence: number;
  danceability: number;
  duration_ms: number;
  tempo: number;
};

export type ListeningRenderData = {
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  bpm: number;
  genre: string;
  duration: number;
  isNowPlaying: boolean;
  mood: MoodMetrics | null;
  recentTrackFeatures: RecentFeature[];
  topGenres: Array<{ genre: string; count: number }>;
  nowPlayingFeatures: MoodMetrics | null;
  progressMs: number;
  trackDurationMs: number;
};

type GenreNode = {
  genre: string;
  count: number;
  angle: number;
  orbit: number;
  radius: number;
  seed: number;
};

type TimelineBar = {
  x: number;
  width: number;
  energy: number;
  valence: number;
  opacity: number;
  phase: number;
};

let metadataFadeFrame = 0;
let timelineCacheKey = '';
let timelineBars: TimelineBar[] = [];
let constellationCacheKey = '';
let constellationNodes: GenreNode[] = [];
let grainPattern: CanvasPattern | null = null;
let grainCanvas: HTMLCanvasElement | null = null;
let spotifyIcon: HTMLImageElement | null = null;
let lastfmIcon: HTMLImageElement | null = null;
let iconLoadAttempted = false;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const clampBpm = (bpm: number): number => {
  if (!Number.isFinite(bpm) || bpm <= 0) return 120;
  return clamp(bpm, 60, 240);
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
        return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
      }
    }
  }

  return null;
};

export const blendColors = (themeAccent: string, override: string, ratio = 0.3): string => {
  const baseRgb = parseColor(themeAccent);
  const overrideRgb = parseColor(override);
  if (!baseRgb || !overrideRgb) return themeAccent;

  const clampedRatio = clamp(ratio, 0, 1);
  const inverse = 1 - clampedRatio;
  const r = Math.round(baseRgb[0] * inverse + overrideRgb[0] * clampedRatio);
  const g = Math.round(baseRgb[1] * inverse + overrideRgb[1] * clampedRatio);
  const b = Math.round(baseRgb[2] * inverse + overrideRgb[2] * clampedRatio);

  return `rgb(${r}, ${g}, ${b})`;
};

const withAlpha = (color: string, alpha: number): string => {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${clamp(alpha, 0, 1)})`;
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
  const b = clamp(rgb[2] + (blueShift - redShift * 0.2) * influence, 0, 255);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
};

const clampMetric = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value as number, 0, 1);
};

const normalizeTempo = (tempo: number | undefined, fallback = 120): number => {
  const value = Number.isFinite(tempo) ? Number(tempo) : fallback;
  return clampBpm(value);
};

const hashNumber = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
};

const pseudoRandom = (seed: number, index: number): number => {
  const x = Math.sin(seed * 0.0013 + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const fetchOptionalJson = async <T>(paths: string[]): Promise<T | null> => {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // noop
    }
  }
  return null;
};

const loadIcon = (path: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = path;
});

const ensureServiceIconsLoaded = async (): Promise<void> => {
  if (iconLoadAttempted || typeof Image === 'undefined') return;
  iconLoadAttempted = true;
  [spotifyIcon, lastfmIcon] = await Promise.all([
    loadIcon('/icons/spotify-mono.svg'),
    loadIcon('/icons/lastfm-mono.svg'),
  ]);
};

const ensureGrainPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  if (grainPattern) return grainPattern;
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 64;
    grainCanvas.height = 64;
    const gtx = grainCanvas.getContext('2d');
    if (!gtx) return null;
    const img = gtx.createImageData(64, 64);
    for (let i = 0; i < img.data.length; i += 4) {
      const value = Math.random() > 0.5 ? 255 : 0;
      img.data[i] = value;
      img.data[i + 1] = value;
      img.data[i + 2] = value;
      img.data[i + 3] = Math.random() * 20;
    }
    gtx.putImageData(img, 0, 0);
  }
  grainPattern = ctx.createPattern(grainCanvas, 'repeat');
  return grainPattern;
};

const buildConstellation = (
  width: number,
  height: number,
  genres: Array<{ genre: string; count: number }>,
  fallbackGenre: string
): GenreNode[] => {
  const nodes = genres.slice(0, 8).filter((g) => g.genre);
  const source = nodes.length ? nodes : [{ genre: fallbackGenre, count: 1 }];
  const maxCount = Math.max(...source.map((item) => item.count), 1);
  const cx = width * 0.28;
  const cy = height * 0.33;
  const radius = Math.min(width, height) * 0.16;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return source.map((item, index) => {
    const ratio = Math.sqrt((index + 0.5) / source.length);
    const orbit = radius * ratio;
    const angle = index * goldenAngle;
    const size = 3 + 5 * clamp(item.count / maxCount, 0.2, 1);
    return {
      genre: item.genre,
      count: item.count,
      angle,
      orbit,
      radius: size,
      seed: hashNumber(`${item.genre}:${item.count}:${cx}:${cy}`),
    };
  });
};

const getConstellationNodes = (
  width: number,
  height: number,
  genres: Array<{ genre: string; count: number }>,
  fallbackGenre: string
): GenreNode[] => {
  const key = `${width}:${height}:${fallbackGenre}:${genres.map((g) => `${g.genre}-${g.count}`).join('|')}`;
  if (constellationCacheKey === key) return constellationNodes;
  constellationCacheKey = key;
  constellationNodes = buildConstellation(width, height, genres, fallbackGenre);
  return constellationNodes;
};

const buildTimelineBars = (
  width: number,
  _height: number,
  features: RecentFeature[],
  genre: string
): TimelineBar[] => {
  const xPad = 12;
  const usableWidth = width - xPad * 2;
  const source = features.length > 0
    ? features.slice(-20)
    : Array.from({ length: 18 }, (_, i) => {
      const seed = hashNumber(`${genre}:${i}`);
      return {
        energy: 0.35 + pseudoRandom(seed, 2) * 0.55,
        valence: 0.25 + pseudoRandom(seed, 5) * 0.5,
        danceability: 0.3 + pseudoRandom(seed, 7) * 0.6,
        duration_ms: 120000 + pseudoRandom(seed, 11) * 170000,
        tempo: 90 + pseudoRandom(seed, 13) * 70,
      };
    });
  const totalDuration = source.reduce((sum, item) => sum + Math.max(70000, item.duration_ms), 0);

  let cursor = xPad;
  return source.map((item, index) => {
    const share = Math.max(70000, item.duration_ms) / totalDuration;
    const widthPx = Math.max(4, usableWidth * share - 1);
    const opacity = 0.06 + (index / Math.max(1, source.length - 1)) * 0.12;
    const bar: TimelineBar = {
      x: cursor,
      width: widthPx,
      energy: clampMetric(item.energy, 0.5),
      valence: clampMetric(item.valence, 0.5),
      opacity,
      phase: index * 0.4,
    };
    cursor += widthPx + 1;
    if (cursor > width - 10) cursor = width - 10;
    return bar;
  }).map((bar) => ({ ...bar, x: clamp(bar.x, xPad, width - xPad - bar.width) }));
};

const getTimelineBars = (width: number, height: number, features: RecentFeature[], genre: string): TimelineBar[] => {
  const key = `${width}:${height}:${genre}:${features.length}:${features.map((f) => `${f.energy.toFixed(3)}-${f.valence.toFixed(3)}-${f.duration_ms}`).join('|')}`;
  if (timelineCacheKey === key) return timelineBars;
  timelineCacheKey = key;
  timelineBars = buildTimelineBars(width, height, features, genre);
  return timelineBars;
};

const formatDuration = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatRelative = (iso: string | undefined): string => {
  if (!iso) return 'OFFLINE';
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return 'OFFLINE';
  const delta = Math.max(0, Date.now() - time);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'LIVE';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
};

const waveformY = (
  x: number,
  width: number,
  centerY: number,
  amplitude: number,
  frame: number,
  mood: MoodMetrics | null,
  fallbackBpm: number,
  phaseOffset = 0
): number => {
  const tempo = normalizeTempo(mood?.tempo, fallbackBpm);
  const tempoNormalized = clamp(tempo / 120, 0.6, 2);
  const energy = clampMetric(mood?.energy, 0.58);
  const danceability = clampMetric(mood?.danceability, 0.5);
  const jaggedness = 1 - danceability;
  const t = x / width;
  const timePrimary = frame * 0.001 * tempoNormalized;
  const timeSecondary = frame * 0.0015 * tempoNormalized;
  const primary = Math.sin(t * TAU * 2 * tempoNormalized + timePrimary + phaseOffset) * energy * 0.52;
  const secondary = Math.sin(t * TAU * 3.8 * tempoNormalized + timeSecondary + phaseOffset * 0.7) * energy * 0.26;
  const flow = Math.sin(t * TAU * (1.2 + danceability * 0.6) + frame * 0.0005 + phaseOffset) * 0.2;
  const noise = Math.sin((t + phaseOffset) * TAU * 11 + frame * 0.00018) * jaggedness * 0.1;
  return centerY + (primary + secondary + flow + noise) * amplitude;
};

const drawMoodAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  mood: MoodMetrics | null
): void => {
  const breathe = 0.03 + (Math.sin(frame * 0.0105) * 0.5 + 0.5) * 0.03;
  const gradient = ctx.createLinearGradient(-width * 0.2, 0, width * 1.1, height);
  const valence = mood?.valence ?? 0.5;
  gradient.addColorStop(0, withAlpha(applyWarmthTint(accent, valence), breathe));
  gradient.addColorStop(1, withAlpha(applyWarmthTint(accent, 1 - valence), breathe * 0.75));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const pattern = ensureGrainPattern(ctx);
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.018;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
};

const drawGenreConstellation = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData
): void => {
  const nodes = getConstellationNodes(width, height, renderData.topGenres, renderData.genre || 'unknown');
  const cx = width * 0.28;
  const cy = height * 0.33;
  const rotate = frame * 0.00033;
  const fadeNodes = clamp((metadataFadeFrame - 30) / 36, 0, 1);
  const labelBase = clamp((metadataFadeFrame - 48) / 120, 0, 1);

  ctx.save();
  ctx.font = `6px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = withAlpha(accent, 0.06);
  ctx.fillText('◉ GENRE MAP', cx - 50, cy - Math.min(width, height) * 0.16 - 12);

  const positions = nodes.map((node, index) => {
    const driftX = Math.sin(frame * 0.004 + node.seed * 0.0001) * 2;
    const driftY = Math.cos(frame * 0.003 + node.seed * 0.0001) * 2;
    const angle = node.angle + rotate;
    return {
      x: cx + Math.cos(angle) * node.orbit + driftX,
      y: cy + Math.sin(angle) * node.orbit + driftY,
      node,
      index,
    };
  });

  if (positions.length === 1) {
    const p = positions[0];
    const pulse = 0.5 + Math.sin(frame * 0.005) * 0.3;

    ctx.strokeStyle = withAlpha(accent, 0.08 * fadeNodes);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(accent, 0.12 * fadeNodes * pulse);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, TAU);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = withAlpha(accent, 0.25 * fadeNodes);
    ctx.arc(p.x, p.y, 3, 0, TAU);
    ctx.fill();

    const labelAngle = frame * 0.0008;
    const labelX = p.x + Math.cos(labelAngle) * 26;
    const labelY = p.y + Math.sin(labelAngle) * 26;
    ctx.font = `7px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.12 * labelBase);
    ctx.textAlign = 'center';
    ctx.fillText(`[${p.node.genre}]`, labelX, labelY);

    ctx.restore();
    return;
  }

  ctx.strokeStyle = withAlpha(accent, 0.08 * fadeNodes);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < positions.length - 1; i += 1) {
    const a = positions[i];
    const b = positions[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  positions.forEach((item, index) => {
    const pulse = 0.7 + Math.sin(frame * 0.007 + index) * 0.3;
    ctx.beginPath();
    ctx.fillStyle = withAlpha(accent, (0.2 + pulse * 0.15) * fadeNodes);
    ctx.arc(item.x, item.y, item.node.radius, 0, TAU);
    ctx.fill();

    const labelFade = labelBase * clamp((metadataFadeFrame - 48 - index * 10) / 18, 0, 1);
    if (labelFade > 0.01) {
      ctx.fillStyle = withAlpha(accent, 0.15 * labelFade);
      ctx.fillText(`[${item.node.genre}]`, item.x + 6, item.y - 3);
    }
  });

  ctx.restore();
};

const drawTimelineStrip = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData
): void => {
  const bars = getTimelineBars(width, height, renderData.recentTrackFeatures, renderData.genre);
  const stripTop = height * 0.88;
  const stripHeight = height * 0.08;
  const baselineY = stripTop + stripHeight;
  const riseBase = clamp((metadataFadeFrame - 12) / 90, 0, 1);

  ctx.save();
  ctx.font = `6px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.08);
  ctx.fillText('▸ RECENT TRACKS', 12, stripTop - 4);

  ctx.strokeStyle = withAlpha(accent, 0.06);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(12, baselineY);
  ctx.lineTo(width - 12, baselineY);
  ctx.stroke();

  bars.forEach((bar, index) => {
    const stagger = clamp((metadataFadeFrame - 12 - index * 3) / 36, 0, 1);
    const rise = riseBase * stagger;
    const breathe = Math.sin(frame * 0.01 + bar.phase) * 0.5;
    const minHeight = stripHeight * 0.15;
    const maxHeight = stripHeight * 0.9;
    const target = minHeight + (maxHeight - minHeight) * bar.energy;
    const h = Math.max(1, target * rise + breathe);
    const y = baselineY - h;
    const warm = applyWarmthTint(accent, bar.valence);
    ctx.fillStyle = withAlpha(warm, bar.opacity);
    const r = Math.min(1.5, bar.width * 0.3);
    ctx.beginPath();
    ctx.moveTo(bar.x, baselineY);
    ctx.lineTo(bar.x, y + r);
    ctx.arcTo(bar.x, y, bar.x + r, y, r);
    ctx.arcTo(bar.x + bar.width, y, bar.x + bar.width, y + r, r);
    ctx.lineTo(bar.x + bar.width, baselineY);
    ctx.fill();
  });

  ctx.fillStyle = withAlpha(accent, 0.06);
  ctx.font = `6px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('2D', 12, baselineY + 8);
  ctx.textAlign = 'right';
  ctx.fillText('NOW →', width - 12, baselineY + 8);
  ctx.restore();
};

const drawMainWaveform = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData
): void => {
  const centerY = height * 0.5;
  const amplitude = height * 0.28;

  ctx.save();
  ctx.lineCap = 'round';

  ctx.strokeStyle = withAlpha(blendColors(accent, '#88a8ff', 0.45), 0.08);
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const y = waveformY(x, width, centerY + 3, amplitude, frame, renderData.mood, renderData.bpm, 0.35);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const y = waveformY(x, width, centerY, amplitude, frame, renderData.mood, renderData.bpm);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (renderData.isNowPlaying) {
    const pulseCount = 4;
    const speed = normalizeTempo(renderData.mood?.tempo, renderData.bpm) / 60;
    for (let i = 0; i < pulseCount; i += 1) {
      const progress = (frame * 0.0035 * speed + i * 0.27) % 1;
      const x = progress * width;
      const y = waveformY(x, width, centerY, amplitude, frame, renderData.mood, renderData.bpm);
      ctx.beginPath();
      ctx.fillStyle = withAlpha(accent, 0.5);
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
};

const drawNowPlayingCard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData
): void => {
  const cardW = 200;
  const cardH = 82;
  const x = width - cardW - 16;
  const y = height * 0.12;
  const fade = clamp((metadataFadeFrame - 18) / 30, 0, 1);
  if (fade <= 0) return;

  const truncateText = (text: string, maxWidth: number): string => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
  };

  const innerWidth = cardW - 24;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.strokeStyle = withAlpha(accent, 0.15);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 5);
  ctx.fill();
  ctx.stroke();

  const bpm = normalizeTempo(renderData.mood?.tempo, renderData.bpm);
  const beatPulse = 0.4 + (Math.sin(frame * (bpm / 60) * 0.1) * 0.5 + 0.5) * 0.35;
  ctx.font = `7px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.25);
  ctx.textAlign = 'left';
  ctx.fillText(renderData.isNowPlaying ? 'NOW PLAYING' : 'LAST PLAYED', x + 12, y + 11);
  ctx.beginPath();
  ctx.fillStyle = renderData.isNowPlaying ? withAlpha('#65d38c', beatPulse) : withAlpha('#d36969', 0.35);
  ctx.arc(x + 7, y + 8, 2, 0, TAU);
  ctx.fill();

  if (renderData.isNowPlaying && renderData.trackDurationMs > 0) {
    const progress = clamp(renderData.progressMs / renderData.trackDurationMs, 0, 1);
    const barWidth = innerWidth - 40;
    ctx.fillStyle = withAlpha(accent, 0.08);
    ctx.fillRect(x + 12, y + 20, barWidth, 4);
    ctx.fillStyle = withAlpha(accent, 0.3);
    ctx.fillRect(x + 12, y + 20, barWidth * progress, 4);
    ctx.font = `7px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.2);
    ctx.fillText(formatDuration(renderData.trackDurationMs), x + 12 + barWidth + 4, y + 24);
  } else {
    ctx.strokeStyle = withAlpha(accent, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const miniY = y + 22;
    const miniW = innerWidth - 10;
    for (let i = 0; i <= miniW; i += 1) {
      const px = x + 12 + i;
      const py = waveformY(i, miniW, miniY, 3, frame, renderData.mood, renderData.bpm, 0.2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const titleStart = 30;
  const titleChars = clamp(Math.floor(((metadataFadeFrame - titleStart) / 60) * Math.max(1, renderData.title.length)), 0, renderData.title.length);
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.5);
  const titleText = truncateText(renderData.title.slice(0, titleChars), innerWidth);
  ctx.fillText(titleText, x + 12, y + 45);

  const artistFade = clamp((metadataFadeFrame - 48) / 24, 0, 1);
  if (artistFade > 0) {
    ctx.font = `8px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.25 * artistFade);
    const artistAlbum = `${renderData.artist} · ${renderData.album}`;
    ctx.fillText(truncateText(artistAlbum, innerWidth), x + 12, y + 60);
  }

  ctx.restore();
};

const drawMoodArcRing = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  renderData: ListeningRenderData
): void => {
  const mood = renderData.nowPlayingFeatures || renderData.mood;
  const cx = width - 74;
  const cy = height - 74;
  const baseRadius = 22;

  ctx.save();
  if (!mood) {
    ctx.strokeStyle = 'rgba(200,200,200,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,200,200,0.14)';
    ctx.font = `12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('—', cx, cy + 4);
    ctx.restore();
    return;
  }

  const metrics = [
    clampMetric(mood.energy, 0.5),
    clampMetric(mood.danceability, 0.5),
    clampMetric(mood.valence, 0.5),
    clampMetric(mood.acousticness, 0.5),
    clamp(normalizeTempo(mood.tempo, renderData.bpm) / 200, 0, 1),
  ];

  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(220,220,220,0.07)';
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + 26, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `6px ${MONO}`;
  ctx.fillStyle = 'rgba(220,220,220,0.12)';
  ctx.textAlign = 'center';
  ctx.fillText('MOOD', cx, cy + (baseRadius + 36));

  metrics.forEach((metric, i) => {
    const entry = clamp((metadataFadeFrame - 60 - i * 12) / 36, 0, 1);
    if (entry <= 0) return;
    const breath = Math.sin(frame * 0.01 + i) * (Math.PI / 18);
    const maxSweep = (Math.PI * 1.5) + breath;
    const sweep = maxSweep * metric * entry;
    const radius = baseRadius + i * 6;
    const start = -Math.PI / 2;
    const end = start + sweep;
    ctx.strokeStyle = ARC_COLORS[i];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = ARC_COLORS[i].replace('0.3', '0.5').replace('0.2', '0.45');
    ctx.arc(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius, 2.2, 0, TAU);
    ctx.fill();
  });

  const glyphPulse = 0.1 + (Math.sin(frame * 0.015) * 0.5 + 0.5) * 0.1;
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = `rgba(225,225,225,${glyphPulse.toFixed(3)})`;
  ctx.fillText('◎', cx, cy + 4);
  ctx.restore();
};

const drawTempoHeartbeat = (
  ctx: CanvasRenderingContext2D,
  width: number,
  frame: number,
  accent: string,
  tempo: number
): void => {
  const bpm = Math.round(clampBpm(tempo));
  const x = width - 112;
  const y = 16;
  const w = 82;
  const h = 20;
  const phase = (frame / 60) * (bpm / 60);
  const cycle = phase % 1;
  const beatGlow = cycle < 0.15 ? 0.4 : 0.18;

  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= w; i += 1) {
    const t = i / w;
    const local = (t + cycle) % 1;
    const spike = local > 0.44 && local < 0.5
      ? -Math.sin(((local - 0.44) / 0.06) * Math.PI) * h * 0.7
      : local >= 0.5 && local < 0.57
        ? Math.sin(((local - 0.5) / 0.07) * Math.PI) * h * 0.25
        : 0;
    const py = y + h * 0.6 + spike;
    const px = x + i;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, beatGlow);
  ctx.fillText(String(bpm), x + w + 6, y + 10);
  ctx.font = `8px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.12);
  ctx.fillText('BPM', x + w + 8, y + 18);
  ctx.restore();
};

const drawServiceLogos = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  accent: string,
  height: number
): void => {
  const x = 12;
  const y = height - 16;
  const cycle = (Math.sin(frame * 0.01) * 0.5) + 0.5;
  const spotifyAlpha = 0.10 + cycle * 0.06;
  const lastAlpha = 0.10 + (1 - cycle) * 0.06;

  ctx.save();
  const fade = clamp((metadataFadeFrame - 90) / 24, 0, 1);
  ctx.globalAlpha = fade;

  if (spotifyIcon && lastfmIcon) {
    ctx.globalAlpha = spotifyAlpha * fade;
    ctx.drawImage(spotifyIcon, x, y, 12, 12);
    ctx.globalAlpha = lastAlpha * fade;
    ctx.drawImage(lastfmIcon, x + 16, y, 12, 12);
  } else {
    ctx.font = `6px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = withAlpha(accent, spotifyAlpha);
    ctx.fillText('spotify', x, y + 10);
    ctx.fillStyle = withAlpha(accent, lastAlpha);
    ctx.fillText('last.fm', x + 34, y + 10);
  }

  ctx.restore();
};

const drawDataSourceIndicator = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  accent: string,
  height: number,
  isLive: boolean,
  updatedAt?: string
): void => {
  const x = 12;
  const y = height - 30;
  const pulse = ((frame / 60) % 4) / 4;

  ctx.save();
  ctx.fillStyle = withAlpha(accent, 0.15);
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, TAU);
  ctx.fill();

  if (pulse < 0.25) {
    const local = pulse / 0.25;
    const radius = 2 + local * 8;
    const alpha = 0.12 * (1 - local);
    ctx.strokeStyle = withAlpha(accent, alpha);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
  }

  const label = isLive ? 'LIVE' : formatRelative(updatedAt);
  ctx.font = `6px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.10);
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 8, y + 2);
  ctx.restore();
};

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.5, Math.min(width, height) * 0.25, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const mergeRenderData = (
  base: Partial<ListeningRenderData>,
  spotifyProfile: SpotifyProfile | null,
  spotifyAudioFeatures: TrackFeatures[] | null
): ListeningRenderData => {
  const features = Array.isArray(spotifyAudioFeatures) ? spotifyAudioFeatures : [];
  const reducedFeatures = features
    .filter((item) => item && Number.isFinite(item.energy))
    .slice(0, 20)
    .map((item) => ({
      energy: clampMetric(item.energy, 0.5),
      valence: clampMetric(item.valence, 0.5),
      danceability: clampMetric(item.danceability, 0.5),
      duration_ms: Math.max(80000, Number(item.duration_ms) || 180000),
      tempo: normalizeTempo(item.tempo),
    }));

  const nowPlayingId = spotifyProfile?.currentTrack?.id || spotifyProfile?.lastPlayed?.id;
  const nowFeature = nowPlayingId ? features.find((item) => item.id === nowPlayingId) : null;

  const nowPlayingFeatures: MoodMetrics | null = nowFeature
    ? {
      energy: clampMetric(nowFeature.energy, 0.5),
      valence: clampMetric(nowFeature.valence, 0.5),
      danceability: clampMetric(nowFeature.danceability, 0.5),
      acousticness: clampMetric(nowFeature.acousticness, 0.5),
      tempo: normalizeTempo(nowFeature.tempo),
    }
    : null;

  const fallbackMoodFromRecent = reducedFeatures.length
    ? {
      energy: reducedFeatures.reduce((s, item) => s + item.energy, 0) / reducedFeatures.length,
      valence: reducedFeatures.reduce((s, item) => s + item.valence, 0) / reducedFeatures.length,
      danceability: reducedFeatures.reduce((s, item) => s + item.danceability, 0) / reducedFeatures.length,
      acousticness: 0.5,
      tempo: reducedFeatures.reduce((s, item) => s + item.tempo, 0) / reducedFeatures.length,
    }
    : null;

  return {
    title: base.title || '',
    artist: base.artist || '',
    album: base.album || '',
    albumArtUrl: base.albumArtUrl || spotifyProfile?.currentTrack?.albumArt || '',
    bpm: Number(base.bpm) || 120,
    genre: base.genre || 'unknown',
    duration: Number(base.duration) || 0,
    isNowPlaying: Boolean(base.isNowPlaying),
    mood: spotifyProfile?.mood || fallbackMoodFromRecent,
    recentTrackFeatures: reducedFeatures,
    topGenres: spotifyProfile?.topGenres || [],
    nowPlayingFeatures,
    progressMs: Number(base.progressMs) || Number(spotifyProfile?.currentTrack?.progressMs) || 0,
    trackDurationMs: Number(base.trackDurationMs)
      || Number(spotifyProfile?.currentTrack?.durationMs)
      || Number(base.duration)
      || 0,
  };
};

export const listeningSlide: SlideModule = {
  id: 'listening',

  async fetchData(): Promise<SlideData | null> {
    await ensureServiceIconsLoaded();

    const spotifyProfile = await fetchOptionalJson<SpotifyProfile>([
      '/data/spotify/profile.json',
      '/spotify/profile.json',
      '/api/spotify/profile.json',
    ]);
    const spotifyAudioFeatures = await fetchOptionalJson<TrackFeatures[]>([
      '/data/spotify/audio-features.json',
      '/spotify/audio-features.json',
      '/api/spotify/audio-features.json',
    ]);

    try {
      const username = import.meta.env.PUBLIC_LASTFM_USERNAME as string | undefined;
      if (username) {
        const recentTrack = await getRecentTrack(username);
        if (recentTrack) {
          const trackInfo = await getTrackInfo(recentTrack.artist, recentTrack.name);
          const dominantColor = recentTrack.albumArtUrl ? await extractDominantColor(recentTrack.albumArtUrl) : null;
          const genre = trackInfo?.tags?.[0] || 'unknown';
          const bpm = trackInfo?.bpm || estimateBpmFromGenre(genre);

          const renderData = mergeRenderData({
            title: recentTrack.name,
            artist: recentTrack.artist,
            album: recentTrack.album,
            albumArtUrl: recentTrack.albumArtUrl,
            bpm,
            genre,
            duration: trackInfo?.duration || 0,
            isNowPlaying: recentTrack.isNowPlaying,
            progressMs: spotifyProfile?.currentTrack?.progressMs || 0,
            trackDurationMs: spotifyProfile?.currentTrack?.durationMs || trackInfo?.duration || 0,
          }, spotifyProfile, spotifyAudioFeatures);

          (window as any).__nucleusListeningData = {
            ...((window as any).__nucleusListeningData || {}),
            moodEnergy: renderData.mood?.energy ?? null,
            moodTempo: renderData.mood?.tempo ?? null,
          };

          return {
            label: 'LISTENING',
            detail: `${recentTrack.name} – ${recentTrack.artist}`,
            link: '#consumption',
            updatedAt: recentTrack.scrobbledAt || new Date().toISOString(),
            accentOverride: dominantColor || undefined,
            renderData,
          };
        }
      }
    } catch (error) {
      console.error('[Nucleus] Live Last.fm fetch failed, trying pre-built data:', error);
    }

    try {
      const response = await fetch('/api/nucleus/listening.json');
      if (response.ok) {
        const data = (await response.json()) as SlideData | null;
        if (data) {
          const merged = mergeRenderData((data.renderData || {}) as Partial<ListeningRenderData>, spotifyProfile, spotifyAudioFeatures);
          data.renderData = merged;

          if (merged.albumArtUrl) {
            const dominantColor = await extractDominantColor(merged.albumArtUrl);
            if (dominantColor) data.accentOverride = dominantColor;
          }

          (window as any).__nucleusListeningData = {
            ...((window as any).__nucleusListeningData || {}),
            moodEnergy: merged.mood?.energy ?? null,
            moodTempo: merged.mood?.tempo ?? null,
          };

          return data;
        }
      }
    } catch (error) {
      console.error('[Nucleus] Failed to fetch pre-built listening data:', error);
    }

    return null;
  },

  render(ctx, width, height, frame, data, theme) {
    const renderData = mergeRenderData((data?.renderData || {}) as Partial<ListeningRenderData>, null, null);
    const primaryAccent = data?.accentOverride ? blendColors(theme.accent, data.accentOverride, 0.3) : theme.accent;
    const accent = applyWarmthTint(primaryAccent, renderData.mood?.valence ?? 0.5);

    ctx.clearRect(0, 0, width, height);

    drawMoodAtmosphere(ctx, width, height, frame, accent, renderData.mood);
    drawMainWaveform(ctx, width, height, frame, accent, renderData);
    drawVignette(ctx, width, height);
    drawTimelineStrip(ctx, width, height, frame, accent, renderData);
    drawNowPlayingCard(ctx, width, height, frame, accent, renderData);
    drawGenreConstellation(ctx, width, height, frame, accent, renderData);
    drawMoodArcRing(ctx, width, height, frame, renderData);
    drawTempoHeartbeat(ctx, width, frame, accent, renderData.mood?.tempo || renderData.bpm);
    drawServiceLogos(ctx, frame, accent, height);
    drawDataSourceIndicator(ctx, frame, accent, height, renderData.isNowPlaying, data?.updatedAt);

    metadataFadeFrame += 1;
  },

  reset() {
    metadataFadeFrame = 0;
  },
};
