import type { SlideData, SlideModule } from '../types';
import {
  estimateBpmFromGenre,
  extractDominantColor,
  getRecentTrack,
  getTrackInfo,
} from '@lib/lastfm';

const TAU = Math.PI * 2;
const BPM_FONT = '10px "IBM Plex Mono", monospace';
const GENRE_FONT = '34px "IBM Plex Mono", monospace';

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

type SpotifyProfile = {
  currentTrack?: { id?: string } | null;
  lastPlayed?: { id?: string } | null;
  mood?: MoodMetrics | null;
  topGenres?: Array<{ genre: string; count: number }>;
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
  recentTrackFeatures: Array<{ energy: number; valence: number; danceability: number; duration_ms: number; tempo: number }>;
  topGenres: Array<{ genre: string; count: number }>;
  nowPlayingFeatures: MoodMetrics | null;
};

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

const simplex2D = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
};

const genreHash = (genre: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < genre.length; i += 1) {
    hash ^= genre.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const pseudoRandom = (seed: number, index: number): number => {
  const x = Math.sin(seed * 0.0013 + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const clampMetric = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value as number, 0, 1);
};

const normalizeTempo = (tempo: number | undefined, fallback = 120): number => {
  const value = Number.isFinite(tempo) ? Number(tempo) : fallback;
  return clampBpm(value);
};

const fetchOptionalJson = async <T>(paths: string[]): Promise<T | null> => {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // noop, try next
    }
  }
  return null;
};

type TerrainPoint = {
  x: number;
  y: number;
  valence: number;
};

let terrainCacheKey = '';
let terrainCachePoints: TerrainPoint[] = [];
let metadataFadeFrame = 0;

const getTerrainPoints = (
  width: number,
  height: number,
  features: ListeningRenderData['recentTrackFeatures'],
  genre: string
): TerrainPoint[] => {
  const dataKey = `${width}:${height}:${genre}:${features.length}:${features.map((item) => `${item.energy.toFixed(3)}-${item.valence.toFixed(3)}-${item.duration_ms}`).join('|')}`;
  if (terrainCacheKey === dataKey && terrainCachePoints.length > 0) {
    return terrainCachePoints;
  }

  const baseY = height * 0.88;
  const points: TerrainPoint[] = [];

  if (features.length > 0) {
    const totalDuration = features.reduce((sum, item) => sum + Math.max(80000, item.duration_ms || 180000), 0);
    let cursor = 0;
    features.forEach((item) => {
      const duration = Math.max(80000, item.duration_ms || 180000);
      const widthShare = duration / totalDuration;
      const centerRatio = cursor + widthShare * 0.5;
      cursor += widthShare;
      const x = clamp(centerRatio * width, 0, width);
      const peakHeight = (height * 0.15) + clampMetric(item.energy, 0.55) * (height * 0.25);
      points.push({
        x,
        y: baseY - peakHeight,
        valence: clampMetric(item.valence, 0.5),
      });
    });
  } else {
    const seed = genreHash(genre || 'unknown');
    const peaks = 12;
    for (let i = 0; i < peaks; i += 1) {
      const ratio = i / (peaks - 1);
      const energyLike = 0.35 + Math.abs(Math.sin(ratio * TAU * 1.7 + pseudoRandom(seed, i) * 4.2)) * 0.55;
      const peakHeight = (height * 0.15) + energyLike * (height * 0.25);
      points.push({
        x: ratio * width,
        y: baseY - peakHeight,
        valence: 0.4 + pseudoRandom(seed, i + 31) * 0.2,
      });
    }
  }

  terrainCacheKey = dataKey;
  terrainCachePoints = points;
  return points;
};

const drawMoodGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  mood: MoodMetrics | null
): void => {
  const driftX = Math.sin(frame * 0.0001) * width * 0.1;
  const gradient = ctx.createLinearGradient(-width * 0.2 + driftX, 0, width * 1.1 + driftX, height);
  const valence = mood?.valence ?? 0.5;

  if (mood == null) {
    gradient.addColorStop(0, 'rgba(80, 90, 110, 0.03)');
    gradient.addColorStop(1, 'rgba(40, 48, 62, 0.04)');
  } else if (valence < 0.3) {
    gradient.addColorStop(0, withAlpha(accent, 0.03));
    gradient.addColorStop(1, 'rgba(80, 100, 140, 0.04)');
  } else if (valence > 0.6) {
    gradient.addColorStop(0, 'rgba(180, 140, 100, 0.04)');
    gradient.addColorStop(1, withAlpha(accent, 0.035));
  } else {
    gradient.addColorStop(0, withAlpha(accent, 0.04));
    gradient.addColorStop(1, 'rgba(75, 80, 90, 0.03)');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawGenreFog = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  primaryGenre: string,
  secondaryGenre: string | null,
  accent: string
): void => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;

  const driftX = Math.sin(frame * 0.00016) * 18;
  const driftY = Math.cos(frame * 0.00013) * 10;

  ctx.globalAlpha = 0.06;
  ctx.font = GENRE_FONT;
  ctx.fillText(primaryGenre.toUpperCase(), width * 0.5 + driftX, height * 0.33 + driftY);

  if (secondaryGenre) {
    ctx.globalAlpha = 0.03;
    ctx.font = '22px "IBM Plex Mono", monospace';
    ctx.fillText(secondaryGenre.toUpperCase(), width * 0.58 - driftX * 0.45, height * 0.42 - driftY * 0.4);
  }

  ctx.restore();
};

const drawTerrain = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  points: TerrainPoint[]
): void => {
  if (points.length < 2) return;

  const breathingOffset = Math.sin(frame * 0.0003) * 2;
  const baseY = height * 0.88 + breathingOffset;

  const path = new Path2D();
  path.moveTo(0, baseY);
  path.lineTo(points[0].x, points[0].y + breathingOffset);

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) * 0.5;
    const jitterA = simplex2D(i * 0.37, frame * 0.00005) * 5;
    const jitterB = simplex2D((i + 1) * 0.37, frame * 0.00005) * 5;
    path.bezierCurveTo(
      midX, p0.y + breathingOffset + jitterA,
      midX, p1.y + breathingOffset + jitterB,
      p1.x, p1.y + breathingOffset
    );
  }

  path.lineTo(width, baseY);
  path.closePath();

  const avgValence = points.reduce((sum, item) => sum + item.valence, 0) / points.length;
  const terrainAccent = applyWarmthTint(accent, avgValence);

  const gradient = ctx.createLinearGradient(0, baseY, 0, height * 0.45);
  gradient.addColorStop(0, withAlpha(terrainAccent, 0.12));
  gradient.addColorStop(1, withAlpha(terrainAccent, 0));

  ctx.fillStyle = gradient;
  ctx.fill(path);

  ctx.strokeStyle = withAlpha(terrainAccent, 0.2);
  ctx.lineWidth = 1;
  ctx.stroke(path);
};

const drawWaveform = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  mood: MoodMetrics | null,
  fallbackBpm: number
): void => {
  const tempo = normalizeTempo(mood?.tempo, fallbackBpm);
  const tempoNormalized = clamp(tempo / 120, 0.6, 2);
  const energy = clampMetric(mood?.energy, 0.6);
  const danceability = clampMetric(mood?.danceability, 0.5);
  const jaggedness = 1 - danceability;

  const centerY = height * 0.5;
  const amplitude = height * (0.15 + energy * 0.25);
  const timePrimary = frame * 0.001 * tempoNormalized;
  const timeSecondary = frame * 0.0014 * tempoNormalized;
  const noiseScale = 3 + jaggedness * 4;

  ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const primary = Math.sin(t * TAU * 2 * tempoNormalized + timePrimary) * energy * 0.5;
    const secondary = Math.sin(t * TAU * 3.7 * tempoNormalized + timeSecondary) * energy * 0.25;
    const flow = Math.sin(t * TAU * (1.1 + danceability * 0.8) + frame * 0.00045) * 0.22;
    const noise = simplex2D(t * noiseScale + frame * 0.0003, 0) * jaggedness * 0.2;
    const shape = primary + secondary + flow + noise;
    const py = centerY + shape * amplitude;

    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();

  ctx.strokeStyle = withAlpha(accent, 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const primary = Math.sin(t * TAU * 2 * tempoNormalized + timePrimary + 0.5) * energy * 0.44;
    const secondary = Math.sin(t * TAU * 3.7 * tempoNormalized + timeSecondary + 0.3) * energy * 0.2;
    const noise = simplex2D(t * noiseScale + frame * 0.00026, 1.33) * jaggedness * 0.12;
    const py = centerY + (primary + secondary + noise) * (amplitude * 0.85) + 4;
    if (x === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.stroke();
};

const drawFloatingMetadata = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData
): void => {
  if (!renderData.title || !renderData.artist) return;

  const fade = clamp(metadataFadeFrame / 120, 0, 1);
  const drift = Math.sin(frame * 0.0007) * 1;
  const x = width - 16;
  const y = height * 0.2 + drift;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '14px "IBM Plex Mono", monospace';
  ctx.fillStyle = withAlpha(accent, 0.3 * fade);
  ctx.fillText(renderData.title, x, y);

  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.fillStyle = withAlpha(accent, 0.2 * fade);
  ctx.fillText(renderData.artist, x, y + 16);

  if (renderData.isNowPlaying) {
    const pulse = 0.45 + Math.sin(frame * 0.004) * 0.15;
    ctx.beginPath();
    ctx.fillStyle = withAlpha(accent, clamp(pulse * fade, 0, 0.6));
    ctx.arc(x - Math.min(220, ctx.measureText(renderData.title).width) - 10, y + 7, 4, 0, TAU);
    ctx.fill();
  }
};

const drawRadar = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  features: MoodMetrics | null
): void => {
  if (!features) return;

  const radius = 50;
  const centerX = width - 16 - radius;
  const centerY = height - 16 - radius;

  const values = [
    clampMetric(features.energy, 0.5),
    clampMetric(features.danceability, 0.5),
    clampMetric(features.valence, 0.5),
    clampMetric(features.acousticness, 0.5),
    clamp(normalizeTempo(features.tempo) / 200, 0, 1),
  ];

  const labels = ['NRG', 'DNC', 'VAL', 'ACO', 'BPM'];

  const vertex = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (TAU * index) / 5;
    const breathe = 1 + Math.sin(frame * 0.0009 + index * 0.8) * 0.05;
    const r = radius * value * breathe;
    return {
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      angle,
    };
  };

  ctx.strokeStyle = withAlpha(accent, 0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (TAU * i) / 5;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    ctx.moveTo(centerX, centerY);
    const angle = -Math.PI / 2 + (TAU * i) / 5;
    ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const p = vertex(i, values[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = withAlpha(accent, 0.12);
  ctx.strokeStyle = withAlpha(accent, 0.25);
  ctx.fill();
  ctx.stroke();

  ctx.font = '7px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = withAlpha(accent, 0.15);
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (TAU * i) / 5;
    const labelX = centerX + Math.cos(angle) * (radius + 10);
    const labelY = centerY + Math.sin(angle) * (radius + 10);
    ctx.fillText(labels[i], labelX, labelY);
  }
};

const drawTempoAndServices = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  tempo: number
): void => {
  const bpm = Math.round(clampBpm(tempo));
  const pulse = 0.25 + 0.18 * Math.sin(frame * (bpm / 60) * 0.06);

  ctx.font = BPM_FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = withAlpha(accent, pulse);
  ctx.fillText(`${bpm} BPM`, width - 16, 16);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = '8px "IBM Plex Mono", monospace';
  ctx.fillStyle = withAlpha(accent, 0.15);
  ctx.fillText('♫ spotify · last.fm', 12, height - 12);
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
    albumArtUrl: base.albumArtUrl || '',
    bpm: Number(base.bpm) || 120,
    genre: base.genre || 'unknown',
    duration: Number(base.duration) || 0,
    isNowPlaying: Boolean(base.isNowPlaying),
    mood: spotifyProfile?.mood || fallbackMoodFromRecent,
    recentTrackFeatures: reducedFeatures,
    topGenres: spotifyProfile?.topGenres || [],
    nowPlayingFeatures,
  };
};

export const listeningSlide: SlideModule = {
  id: 'listening',

  async fetchData(): Promise<SlideData | null> {
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

    // Try live Last.fm API first for freshest data
    try {
      const username = import.meta.env.PUBLIC_LASTFM_USERNAME as string | undefined;
      if (username) {
        const recentTrack = await getRecentTrack(username);
        if (recentTrack) {
          const trackInfo = await getTrackInfo(recentTrack.artist, recentTrack.name);
          const dominantColor = recentTrack.albumArtUrl
            ? await extractDominantColor(recentTrack.albumArtUrl)
            : null;
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

    // Fall back to pre-built data from build time
    try {
      const response = await fetch('/api/nucleus/listening.json');
      if (response.ok) {
        const data = (await response.json()) as SlideData | null;
        if (data) {
          const merged = mergeRenderData((data.renderData || {}) as Partial<ListeningRenderData>, spotifyProfile, spotifyAudioFeatures);
          data.renderData = merged;

          if (merged.albumArtUrl) {
            const dominantColor = await extractDominantColor(merged.albumArtUrl);
            if (dominantColor) {
              data.accentOverride = dominantColor;
            }
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
    const primaryAccent = data.accentOverride ? blendColors(theme.accent, data.accentOverride, 0.3) : theme.accent;
    const accent = applyWarmthTint(primaryAccent, renderData.mood?.valence ?? 0.5);

    const topGenre = renderData.topGenres[0]?.genre || renderData.genre || 'unknown';
    const secondaryGenre = renderData.topGenres[1]?.genre || null;
    const terrainPoints = getTerrainPoints(width, height, renderData.recentTrackFeatures, topGenre);

    ctx.clearRect(0, 0, width, height);

    drawMoodGradient(ctx, width, height, frame, accent, renderData.mood);
    drawGenreFog(ctx, width, height, frame, topGenre, secondaryGenre, accent);
    drawTerrain(ctx, width, height, frame, accent, terrainPoints);
    drawWaveform(ctx, width, height, frame, accent, renderData.mood, renderData.bpm);
    drawFloatingMetadata(ctx, width, height, frame, accent, renderData);
    drawRadar(ctx, width, height, frame, accent, renderData.nowPlayingFeatures || renderData.mood);
    drawTempoAndServices(ctx, width, height, frame, accent, renderData.mood?.tempo || renderData.bpm);

    metadataFadeFrame += 1;
  },

  reset() {
    metadataFadeFrame = 0;
  }
};
