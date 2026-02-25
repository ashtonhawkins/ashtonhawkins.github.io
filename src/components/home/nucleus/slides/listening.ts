import type { SlideData, SlideModule } from '../types';
import {
  estimateBpmFromGenre,
  extractDominantColor,
  getRecentTrack,
  getTrackInfo,
} from '@lib/lastfm';

const TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", monospace';

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

/* ── module-level state ── */

let metadataFadeFrame = 0;
let grainPattern: CanvasPattern | null = null;
let grainCanvas: HTMLCanvasElement | null = null;

// retained for fetchData() — do not remove
let spotifyIcon: HTMLImageElement | null = null;
let lastfmIcon: HTMLImageElement | null = null;
let iconLoadAttempted = false;

// album art image cache
let albumArtImage: HTMLImageElement | null = null;
let cachedAlbumArtUrl = '';
let blurredCanvas: HTMLCanvasElement | null = null;
let albumArtLoading = false;

/* ── pure helpers ── */

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

/* ── data fetching utilities (used by fetchData — do not modify) ── */

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

/* ── grain texture ── */

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

/* ── album art loader (async, non-blocking) ── */

const loadAlbumArt = (url: string): void => {
  if (!url || albumArtLoading || url === cachedAlbumArtUrl) return;
  albumArtLoading = true;
  cachedAlbumArtUrl = url;
  albumArtImage = null;
  blurredCanvas = null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    albumArtImage = img;
    albumArtLoading = false;

    // create tiny offscreen canvas for performant blur
    const small = document.createElement('canvas');
    small.width = 40;
    small.height = 30;
    const sCtx = small.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(img, 0, 0, 40, 30);
      blurredCanvas = small;
    }
  };
  img.onerror = () => {
    albumArtLoading = false;
  };
  img.src = url;
};

/* ── drawing functions ── */

const drawAlbumArtBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  mood: MoodMetrics | null,
): void => {
  // blurred album art → full-bleed background
  if (blurredCanvas) {
    ctx.drawImage(blurredCanvas, 0, 0, width, height);
    // dark overlay for text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, width, height);
  }

  // subtle breathing colour tint
  const breathe = 0.02 + (Math.sin(frame * 0.0105) * 0.5 + 0.5) * 0.02;
  const valence = mood?.valence ?? 0.5;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, withAlpha(applyWarmthTint(accent, valence), breathe));
  gradient.addColorStop(1, withAlpha(applyWarmthTint(accent, 1 - valence), breathe * 0.75));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // film-grain overlay
  const pattern = ensureGrainPattern(ctx);
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
};

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const gradient = ctx.createRadialGradient(
    width * 0.5, height * 0.5, Math.min(width, height) * 0.2,
    width * 0.5, height * 0.5, Math.max(width, height) * 0.7,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawCenteredTrackInfo = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData,
  updatedAt?: string,
): void => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = width * 0.5;

  /* status label + dot */
  const statusY = height * 0.33;
  const statusFade = clamp((metadataFadeFrame - 6) / 24, 0, 1);
  if (statusFade > 0) {
    const bpm = normalizeTempo(renderData.mood?.tempo, renderData.bpm);
    const beatPulse = 0.5 + (Math.sin(frame * (bpm / 60) * 0.1) * 0.5 + 0.5) * 0.4;

    const label = renderData.isNowPlaying
      ? 'NOW PLAYING'
      : `LAST PLAYED \u00B7 ${formatRelative(updatedAt)}`;

    ctx.font = `8px ${MONO}`;
    const labelWidth = ctx.measureText(label).width;

    // pulsing dot
    const dotColor = renderData.isNowPlaying
      ? withAlpha('#65d38c', beatPulse * statusFade)
      : withAlpha(accent, 0.3 * statusFade);
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(cx - labelWidth * 0.5 - 10, statusY, 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = withAlpha(accent, 0.35 * statusFade);
    ctx.fillText(label, cx, statusY);
  }

  /* track title — large, bold, centered */
  const titleSize = Math.max(24, Math.min(36, width * 0.065));
  const titleY = height * 0.43;
  const titleFade = clamp((metadataFadeFrame - 12) / 36, 0, 1);
  const titleChars = clamp(
    Math.floor(((metadataFadeFrame - 12) / 60) * Math.max(1, renderData.title.length)),
    0,
    renderData.title.length,
  );

  if (titleFade > 0 && titleChars > 0) {
    ctx.font = `bold ${Math.round(titleSize)}px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.9 * titleFade);

    let titleText = renderData.title.slice(0, titleChars);
    const maxWidth = width * 0.85;
    if (ctx.measureText(titleText).width > maxWidth) {
      while (titleText.length > 1 && ctx.measureText(`${titleText}\u2026`).width > maxWidth) {
        titleText = titleText.slice(0, -1);
      }
      titleText += '\u2026';
    }
    ctx.fillText(titleText, cx, titleY);
  }

  /* artist */
  const artistY = titleY + titleSize * 0.7 + 10;
  const artistFade = clamp((metadataFadeFrame - 36) / 24, 0, 1);
  if (artistFade > 0) {
    const artistSize = Math.max(14, Math.min(16, width * 0.032));
    ctx.font = `${Math.round(artistSize)}px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.5 * artistFade);
    let artistText = renderData.artist;
    const maxArtistWidth = width * 0.8;
    if (ctx.measureText(artistText).width > maxArtistWidth) {
      while (artistText.length > 1 && ctx.measureText(`${artistText}\u2026`).width > maxArtistWidth) {
        artistText = artistText.slice(0, -1);
      }
      artistText += '\u2026';
    }
    ctx.fillText(artistText, cx, artistY);
  }

  /* album */
  const albumY = artistY + 22;
  const albumFade = clamp((metadataFadeFrame - 48) / 24, 0, 1);
  if (albumFade > 0) {
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = withAlpha(accent, 0.25 * albumFade);
    let albumText = renderData.album;
    const maxAlbumWidth = width * 0.7;
    if (ctx.measureText(albumText).width > maxAlbumWidth) {
      while (albumText.length > 1 && ctx.measureText(`${albumText}\u2026`).width > maxAlbumWidth) {
        albumText = albumText.slice(0, -1);
      }
      albumText += '\u2026';
    }
    ctx.fillText(albumText, cx, albumY);
  }

  ctx.restore();
};

const drawMainWaveform = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: ListeningRenderData,
): void => {
  const mood = renderData.nowPlayingFeatures || renderData.mood;
  const centerY = height * 0.72;
  const energy = clampMetric(mood?.energy, 0.5);
  const valence = clampMetric(mood?.valence, 0.5);
  const danceability = clampMetric(mood?.danceability, 0.5);
  const tempo = normalizeTempo(mood?.tempo, renderData.bpm);

  // energy → amplitude
  const amplitude = height * 0.04 + height * 0.1 * energy;
  // valence → color warmth
  const waveColor = applyWarmthTint(accent, valence);
  const tempoNorm = clamp(tempo / 120, 0.6, 2);
  // danceability → smoothness (low = jagged)
  const jaggedness = 1 - danceability;
  // tempo → animation speed
  const time = frame * 0.001 * tempoNorm;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = withAlpha(waveColor, 0.6);
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const primary = Math.sin(t * TAU * 2 * tempoNorm + time) * energy * 0.52;
    const secondary = Math.sin(t * TAU * 3.8 * tempoNorm + time * 1.5) * energy * 0.26;
    const flow = Math.sin(t * TAU * (1.2 + danceability * 0.6) + frame * 0.0005) * 0.2;
    const noise = Math.sin(t * TAU * 11 + frame * 0.00018) * jaggedness * 0.1;
    const y = centerY + (primary + secondary + flow + noise) * amplitude;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
};

const drawTempoHeartbeat = (
  ctx: CanvasRenderingContext2D,
  width: number,
  frame: number,
  accent: string,
  tempo: number,
): void => {
  const bpm = Math.round(clampBpm(tempo));
  const x = width - 130;
  const y = 14;
  const w = 96;
  const h = 26;
  const phase = (frame / 60) * (bpm / 60);
  const cycle = phase % 1;
  const beatGlow = cycle < 0.15 ? 0.45 : 0.2;

  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.8;
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

  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, beatGlow);
  ctx.textAlign = 'left';
  ctx.fillText(String(bpm), x + w + 8, y + 12);
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = withAlpha(accent, 0.15);
  ctx.fillText('BPM', x + w + 10, y + 24);
  ctx.restore();
};

const drawBottomStatsBar = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  renderData: ListeningRenderData,
): void => {
  const fade = clamp((metadataFadeFrame - 60) / 30, 0, 1);
  if (fade <= 0) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = `9px ${MONO}`;

  const y = height - 12;
  const items: string[] = [];

  // top genre
  if (renderData.topGenres.length > 0) {
    items.push(renderData.topGenres[0].genre.toUpperCase());
  }
  // second genre
  if (renderData.topGenres.length > 1) {
    items.push(renderData.topGenres[1].genre.toUpperCase());
  }
  // recent track count
  if (renderData.recentTrackFeatures.length > 0) {
    items.push(`${renderData.recentTrackFeatures.length} RECENT`);
  }

  const display = items.slice(0, 3);
  if (display.length === 0) {
    ctx.restore();
    return;
  }

  const text = display.join('  \u00B7  ');
  ctx.fillStyle = withAlpha(accent, 0.18 * fade);
  ctx.fillText(text, width * 0.5, y);
  ctx.restore();
};

const drawDataSourceIndicator = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  accent: string,
  height: number,
  isLive: boolean,
): void => {
  const x = 12;
  const y = height - 14;
  const pulse = ((frame / 60) % 4) / 4;

  ctx.save();
  const dotAlpha = isLive ? 0.25 : 0.12;
  ctx.fillStyle = isLive ? withAlpha('#65d38c', dotAlpha) : withAlpha(accent, dotAlpha);
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, TAU);
  ctx.fill();

  if (pulse < 0.25) {
    const local = pulse / 0.25;
    const radius = 2.5 + local * 8;
    const alpha = 0.12 * (1 - local);
    ctx.strokeStyle = isLive ? withAlpha('#65d38c', alpha) : withAlpha(accent, alpha);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
};

/* ── data merge (unchanged) ── */

const mergeRenderData = (
  base: Partial<ListeningRenderData>,
  spotifyProfile: SpotifyProfile | null,
  spotifyAudioFeatures: TrackFeatures[] | null,
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

/* ── slide module ── */

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

    // kick off album art loading (async, non-blocking — only reloads when URL changes)
    if (renderData.albumArtUrl) {
      loadAlbumArt(renderData.albumArtUrl);
    }

    ctx.clearRect(0, 0, width, height);

    drawAlbumArtBackground(ctx, width, height, frame, accent, renderData.mood);
    drawVignette(ctx, width, height);
    drawCenteredTrackInfo(ctx, width, height, frame, accent, renderData, data?.updatedAt);
    drawMainWaveform(ctx, width, height, frame, accent, renderData);
    drawTempoHeartbeat(ctx, width, frame, accent, renderData.mood?.tempo || renderData.bpm);
    drawBottomStatsBar(ctx, width, height, accent, renderData);
    drawDataSourceIndicator(ctx, frame, accent, height, renderData.isNowPlaying);

    metadataFadeFrame += 1;
  },

  reset() {
    metadataFadeFrame = 0;
  },
};
