import type { SlideData, SlideModule } from '../types';
import {
  estimateBpmFromGenre,
  extractDominantColor,
  getRecentTrack,
  getRecentTracks,
  getTrackInfo,
  getUserInfo,
  getUserTopArtists,
} from '@lib/lastfm';
import { resolveGenrePalette } from './genre-color-map';

const TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", monospace';

export type MoodMetrics = {
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

export type ListeningRenderData = {
  trackTitle: string;
  artistName: string;
  albumTitle: string;
  albumArtUrl: string;
  isNowPlaying: boolean;
  lastPlayedTimestamp: string;
  trackDuration: number;
  trackTags: string[];
  playCount: number;
  artistPlayCount: number;
  loved: boolean;
  scrobblesThisWeek: number;
  scrobblesAllTime: number;
  topArtist: string;
  topArtistPlays: number;
  topGenre: string;
  topAlbum: string;
  recentTracks: Array<{ title: string; artist: string; albumArt: string; timestamp: string; loved?: boolean }>;
  topArtists: Array<{ artist: string; plays: number }>;
  listeningStreak: number;
  avgScrobblesPerDay: number;
  bpm: number;
  key?: string;
  energy?: number;
  valence?: number;
  mood: MoodMetrics | null;
  progressMs: number;
  trackDurationMs: number;
};

let metadataFadeFrame = 0;
let grainPattern: CanvasPattern | null = null;
let grainCanvas: HTMLCanvasElement | null = null;
let albumArtImage: HTMLImageElement | null = null;
let cachedAlbumArtUrl = '';
let albumArtLoading = false;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const withAlpha = (rgb: [number, number, number], alpha: number): string => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clamp(alpha, 0, 1)})`;

const parseHex = (input: string): [number, number, number] => {
  const hex = input.trim().replace('#', '');
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
};

const lerpRgb = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const fetchOptionalJson = async <T>(paths: string[]): Promise<T | null> => {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) return (await response.json()) as T;
    } catch {
      // noop
    }
  }
  return null;
};

const formatRelative = (iso: string): string => {
  if (!iso) return 'OFFLINE';
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 'OFFLINE';
  const deltaM = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (deltaM < 1) return 'LIVE';
  if (deltaM < 60) return `${deltaM}m ago`;
  const h = Math.floor(deltaM / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const ensureGrainPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  if (grainPattern) return grainPattern;
  grainCanvas = document.createElement('canvas');
  grainCanvas.width = 96;
  grainCanvas.height = 96;
  const gtx = grainCanvas.getContext('2d');
  if (!gtx) return null;
  const img = gtx.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() > 0.52 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 16 + Math.random() * 18;
  }
  gtx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(grainCanvas, 'repeat');
  return grainPattern;
};

const loadAlbumArt = (url: string): void => {
  if (!url || albumArtLoading || cachedAlbumArtUrl === url || typeof Image === 'undefined') return;
  albumArtLoading = true;
  cachedAlbumArtUrl = url;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    albumArtImage = img;
    albumArtLoading = false;
  };
  img.onerror = () => {
    albumArtLoading = false;
    albumArtImage = null;
  };
  img.src = url;
};

const drawBackgroundAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  p1: [number, number, number],
  p2: [number, number, number],
  valence: number,
  energy: number,
  bpm: number,
) => {
  const coolShift = valence < 0.45 ? [16, 24, 44] : [0, 0, 0];
  const warmShift = valence > 0.55 ? [28, 16, 0] : [0, 0, 0];
  const baseA = lerpRgb([7, 10, 17], [14, 19, 30], energy * 0.5);
  const baseB = lerpRgb([4, 6, 11], [10, 14, 22], energy * 0.6);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, withAlpha(lerpRgb(baseA as [number, number, number], coolShift as [number, number, number], 0.2), 1));
  bg.addColorStop(1, withAlpha(lerpRgb(baseB as [number, number, number], warmShift as [number, number, number], 0.2), 1));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const speed = 0.0015 + energy * 0.003;
  for (let i = 0; i < 6; i += 1) {
    const y = height * (0.15 + i * 0.14) + Math.sin(frame * speed * (i + 1) + i) * (8 + energy * 16);
    const h = 24 + i * 6;
    const t = i / 5;
    const band = lerpRgb(p1, p2, t);
    ctx.fillStyle = withAlpha(band, 0.08 + (i % 2) * 0.02);
    ctx.fillRect(0, y, width, h);
  }

  const pulsePeriodFrames = (60 / clamp(bpm, 60, 220)) * 60;
  const pulse = 0.02 + ((Math.sin((frame / pulsePeriodFrames) * TAU) + 1) * 0.5) * 0.02;
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.fillRect(0, 0, width, height);

  const grain = ensureGrainPattern(ctx);
  if (grain) {
    ctx.save();
    ctx.translate((frame * 0.35) % 96, (frame * 0.5) % 96);
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = grain;
    ctx.fillRect(-96, -96, width + 192, height + 192);
    ctx.restore();
  }
};

const drawAlbumArtLayer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  p1: [number, number, number],
  p2: [number, number, number],
  isNowPlaying: boolean,
  lastPlayedTimestamp: string,
) => {
  const artSize = clamp(width * 0.2, 120, 220);
  const x = width < 760 ? width * 0.08 : width * 0.07;
  const y = height * 0.5 - artSize * 0.5 + Math.sin(frame * 0.018) * 4;
  const radius = 8;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, artSize, artSize, radius);
  ctx.clip();

  if (albumArtImage) {
    ctx.filter = 'grayscale(1) contrast(1.12)';
    ctx.drawImage(albumArtImage, x, y, artSize, artSize);
    ctx.filter = 'none';
    const duo = ctx.createLinearGradient(x, y, x + artSize, y + artSize);
    duo.addColorStop(0, withAlpha(p1, 0.28));
    duo.addColorStop(1, withAlpha(p2, 0.32));
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = duo;
    ctx.fillRect(x, y, artSize, artSize);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const g = ctx.createRadialGradient(x + artSize * 0.5, y + artSize * 0.5, 8, x + artSize * 0.5, y + artSize * 0.5, artSize * 0.8);
    g.addColorStop(0, withAlpha(p1, 0.6));
    g.addColorStop(1, withAlpha(p2, 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, artSize, artSize);
    for (let i = 0; i < 22; i += 1) {
      ctx.strokeStyle = withAlpha(lerpRgb(p1, p2, i / 22), 0.2);
      ctx.beginPath();
      ctx.arc(x + artSize / 2, y + artSize / 2, 10 + i * 4, 0, TAU);
      ctx.stroke();
    }
  }

  for (let sy = y; sy < y + artSize; sy += 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, sy, artSize, 1);
  }
  ctx.restore();

  ctx.strokeStyle = withAlpha(p1, 0.8);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, artSize, artSize);
  ctx.shadowColor = withAlpha(p1, 0.6);
  ctx.shadowBlur = 18;
  ctx.strokeRect(x, y, artSize, artSize);
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.translate(0, (y + artSize * 2 + 6));
  ctx.scale(1, -0.22);
  if (albumArtImage) ctx.drawImage(albumArtImage, x, y, artSize, artSize);
  ctx.restore();

  ctx.font = `10px ${MONO}`;
  if (isNowPlaying) {
    const bx = x + 10;
    const by = y + artSize - 12;
    for (let i = 0; i < 4; i += 1) {
      const h = 5 + ((Math.sin(frame * 0.12 + i * 0.8) + 1) * 0.5) * 14;
      ctx.fillStyle = '#10B981';
      ctx.fillRect(bx + i * 5, by - h, 3, h);
    }
  } else {
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.fillText(`LAST · ${formatRelative(lastPlayedTimestamp)}`, x + 8, y + artSize - 8);
  }
};

const drawWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, p1: [number, number, number], p2: [number, number, number], bpm: number, energy: number) => {
  const bars = clamp(Math.floor(width / 10), 80, 120);
  const baseY = height * 0.73;
  const span = width * 0.95;
  const startX = width * 0.025;
  const step = span / bars;
  const amp = 14 + energy * 34;

  for (let i = 0; i < bars; i += 1) {
    const x = startX + i * step;
    const t = i / (bars - 1);
    const c = lerpRgb(p1, p2, t);
    const phase = frame * (0.05 + (bpm / 2400)) + i * 0.35;
    const h = Math.max(2, (Math.sin(phase) * 0.5 + 0.5) * amp + (Math.sin(phase * 0.33) * 0.5 + 0.5) * amp * 0.55);
    const entry = clamp((metadataFadeFrame - Math.abs(i - bars / 2) * 0.4) / 20, 0, 1);
    ctx.fillStyle = withAlpha(c, 0.22 + entry * 0.12);
    ctx.fillRect(x, baseY - h, 2, h * entry);
  }

  const tickSpacing = clamp(2600 / clamp(bpm, 60, 220), 10, 30);
  ctx.fillStyle = withAlpha(p2, 0.45);
  for (let x = 0; x < width; x += tickSpacing) {
    ctx.fillRect(x, baseY + 5, 1, 3);
  }
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = withAlpha(p2, 0.8);
  ctx.fillText(`${Math.round(bpm)} BPM`, width - 60, baseY + 16);
};

const trimToWidth = (ctx: CanvasRenderingContext2D, text: string, max: number): string => {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 2 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
};

const drawTrackInfo = (ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, data: ListeningRenderData, p1: [number, number, number], p2: [number, number, number]) => {
  const left = width < 760 ? width * 0.34 : width * 0.32;
  const top = height * 0.2;
  const bpm = data.bpm || data.mood?.tempo || 110;
  const dotPulse = 0.45 + ((Math.sin(frame * ((clamp(bpm, 60, 220) / 60) * 0.1)) + 1) * 0.5) * 0.55;
  const status = data.isNowPlaying ? 'NOW PLAYING' : `LAST PLAYED · ${formatRelative(data.lastPlayedTimestamp)}`;

  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = withAlpha([148, 163, 184], 0.9);
  ctx.fillText(status, left + 16, top);
  ctx.fillStyle = withAlpha(data.isNowPlaying ? [16, 185, 129] : [100, 116, 139], dotPulse);
  ctx.beginPath();
  ctx.arc(left, top - 2, 4, 0, TAU);
  ctx.fill();

  const titleWords = (data.trackTitle || '').split(/\s+/).filter(Boolean);
  let drawTitle = '';
  const wordsVisible = clamp(Math.floor(metadataFadeFrame / 3), 0, titleWords.length);
  drawTitle = titleWords.slice(0, wordsVisible).join(' ');

  const titleSize = data.trackTitle.length > 30 ? 24 : 30;
  ctx.font = `700 ${titleSize}px ${MONO}`;
  ctx.shadowColor = withAlpha(p1, 0.45);
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(240,248,255,0.95)';
  ctx.fillText(trimToWidth(ctx, drawTitle || data.trackTitle, width * 0.44), left, top + 36);
  ctx.shadowBlur = 0;

  if (data.loved) {
    ctx.fillStyle = 'rgba(244,114,182,0.95)';
    ctx.fillText('♥', left + width * 0.36, top + 34);
  }

  ctx.font = `15px ${MONO}`;
  ctx.fillStyle = withAlpha([203, 213, 225], 0.88);
  ctx.fillText(`— ${trimToWidth(ctx, data.artistName, width * 0.4)}`, left, top + 62);
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = withAlpha([148, 163, 184], 0.9);
  ctx.fillText(`FROM ${trimToWidth(ctx, data.albumTitle, width * 0.4)}`, left, top + 80);

  let px = left;
  const py = top + 100;
  for (let i = 0; i < data.trackTags.slice(0, 4).length; i += 1) {
    const tag = data.trackTags[i] || '';
    const pal = resolveGenrePalette([tag], '#74c6ff');
    const c = parseHex(pal.primary);
    const visible = clamp((metadataFadeFrame - 35 - i * 4) / 16, 0, 1);
    if (!visible) continue;
    ctx.font = `10px ${MONO}`;
    const label = tag.toUpperCase();
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = withAlpha(c, 0.2 * visible);
    ctx.fillRect(px, py - 10, w, 16);
    ctx.strokeStyle = withAlpha(c, 0.4 * visible);
    ctx.strokeRect(px, py - 10, w, 16);
    ctx.fillStyle = withAlpha(c, 0.95 * visible);
    ctx.fillText(label, px + 6, py + 1);
    px += w + 6;
  }

  const statX = width * 0.02;
  const statY = height * 0.14;
  const trackPlays = Math.max(1, data.playCount || 1);
  ctx.fillStyle = 'rgba(8,15,26,0.55)';
  ctx.fillRect(statX, statY, 74, 94);
  for (let i = 0; i < Math.min(trackPlays, 18); i += 1) {
    ctx.fillStyle = 'rgba(148,163,184,0.09)';
    ctx.fillRect(statX + 8, statY + 80 - i * 4, 58, 1);
  }
  ctx.font = `700 28px ${MONO}`;
  ctx.fillStyle = 'rgba(241,245,249,0.95)';
  ctx.fillText(trackPlays === 1 ? 'NEW' : String(trackPlays), statX + 10, statY + 45);
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = 'rgba(148,163,184,0.88)';
  ctx.fillText(trackPlays === 1 ? 'first play' : 'plays', statX + 10, statY + 62);

  if (data.energy != null || data.valence != null || data.key) {
    const chipX = left;
    const chipY = height * 0.64;
    ctx.fillStyle = 'rgba(8,14,24,0.58)';
    ctx.fillRect(chipX, chipY, 170, 42);
    ctx.strokeStyle = withAlpha(p2, 0.4);
    ctx.strokeRect(chipX, chipY, 170, 42);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.fillText(`${Math.round(data.bpm)} BPM   ${data.key ?? '—'}`, chipX + 8, chipY + 13);
    const energy = clamp(data.energy ?? data.mood?.energy ?? 0.5, 0, 1);
    const valence = clamp(data.valence ?? data.mood?.valence ?? 0.5, 0, 1);
    ctx.fillStyle = withAlpha(p1, 0.9);
    ctx.fillRect(chipX + 8, chipY + 20, energy * 60, 4);
    ctx.fillStyle = withAlpha(p2, 0.9);
    ctx.fillRect(chipX + 90, chipY + 20, valence * 60, 4);
    ctx.fillStyle = 'rgba(148,163,184,0.9)';
    ctx.fillText('energy', chipX + 8, chipY + 36);
    ctx.fillText('mood', chipX + 90, chipY + 36);
  }
};

const drawTimeline = (ctx: CanvasRenderingContext2D, width: number, height: number, data: ListeningRenderData) => {
  if (width < 920) return;
  const rowH = 18;
  const x = width - 250;
  const y = height * 0.14;
  ctx.fillStyle = 'rgba(3,8,15,0.5)';
  ctx.fillRect(x - 10, y - 12, 244, 180);
  ctx.font = `9px ${MONO}`;

  data.recentTracks.slice(0, 8).forEach((track, idx) => {
    const a = clamp(1 - idx * 0.11, 0.25, 1);
    const yy = y + idx * rowH;
    if (idx === 0) {
      ctx.fillStyle = 'rgba(16,185,129,0.35)';
      ctx.fillRect(x - 10, yy - 10, 2, 14);
    }
    ctx.fillStyle = `rgba(226,232,240,${a})`;
    const label = `${formatRelative(track.timestamp).replace(' ago', '')} · ${track.title} · ${track.artist}`;
    ctx.fillText(trimToWidth(ctx, label, 228), x, yy);
    if (track.loved) {
      ctx.fillStyle = `rgba(244,114,182,${a})`;
      ctx.fillText('♥', x + 214, yy);
    }
  });
};

const drawBottomStats = (ctx: CanvasRenderingContext2D, width: number, height: number, data: ListeningRenderData, p1: [number, number, number], p2: [number, number, number]) => {
  const y = height - 46;
  const cols = 5;
  const colW = width / cols;
  const progress = clamp((metadataFadeFrame - 25) / 40, 0, 1);

  ctx.fillStyle = 'rgba(2,7,13,0.6)';
  ctx.fillRect(0, y, width, 46);

  for (let i = 0; i < cols; i += 1) {
    const x = i * colW;
    ctx.strokeStyle = 'rgba(148,163,184,0.13)';
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 42);
    ctx.stroke();
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = 'rgba(148,163,184,0.8)';

    if (i === 0) {
      const count = Math.round(data.scrobblesThisWeek * progress);
      ctx.fillText(`${count}`, x + 10, y + 13);
      ctx.fillText('week', x + 10, y + 24);
      for (let d = 0; d < 7; d += 1) {
        const h = 3 + (((count / 7) * (0.6 + (d % 3) * 0.2)) % 10);
        ctx.fillStyle = d === new Date().getDay() ? withAlpha(p1, 0.95) : 'rgba(148,163,184,0.25)';
        ctx.fillRect(x + 10 + d * 10, y + 40 - h, 6, h);
      }
    } else if (i === 1) {
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      ctx.fillText(trimToWidth(ctx, data.topArtist || '—', colW - 20), x + 10, y + 13);
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillText(`${data.topArtistPlays || 0} plays`, x + 10, y + 24);
      data.topArtists.slice(0, 3).forEach((a, idx) => {
        const max = data.topArtists[0]?.plays || 1;
        const w = clamp((a.plays / max) * 62, 8, 62);
        ctx.fillStyle = idx === 0 ? withAlpha(p2, 0.9) : 'rgba(148,163,184,0.45)';
        ctx.fillRect(x + 10, y + 30 + idx * 4, w, 2);
      });
    } else if (i === 2) {
      ctx.fillStyle = withAlpha(p1, 0.95);
      ctx.fillText((data.topGenre || '—').toUpperCase(), x + 10, y + 13);
      const dots = 10;
      for (let d = 0; d < dots; d += 1) {
        const t = d / (dots - 1);
        ctx.fillStyle = withAlpha(lerpRgb(p1, p2, t), 0.85);
        ctx.beginPath();
        ctx.arc(x + 12 + d * 8, y + 33, 2, 0, TAU);
        ctx.fill();
      }
    } else if (i === 3) {
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      ctx.fillText(`${Math.round(data.listeningStreak * progress)}`, x + 10, y + 13);
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillText('day streak', x + 10, y + 24);
      const dots = Math.min(14, Math.max(1, data.listeningStreak));
      for (let d = 0; d < dots; d += 1) {
        ctx.fillStyle = d === dots - 1 ? withAlpha([16, 185, 129], 0.95) : 'rgba(148,163,184,0.45)';
        ctx.beginPath();
        ctx.arc(x + 12 + d * 7, y + 34, 2.2, 0, TAU);
        ctx.fill();
      }
    } else {
      const life = Math.round(data.scrobblesAllTime * progress);
      ctx.fillStyle = 'rgba(226,232,240,0.9)';
      ctx.fillText(life.toLocaleString(), x + 10, y + 13);
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillText('all time', x + 10, y + 24);
      ctx.fillText(`~${data.avgScrobblesPerDay.toFixed(1)}/day`, x + 10, y + 35);
    }
  }
};

const mergeRenderData = (
  base: Partial<ListeningRenderData>,
  spotifyProfile: SpotifyProfile | null,
  spotifyAudioFeatures: TrackFeatures[] | null,
): ListeningRenderData => {
  const features = Array.isArray(spotifyAudioFeatures) ? spotifyAudioFeatures : [];
  const nowPlayingId = spotifyProfile?.currentTrack?.id || spotifyProfile?.lastPlayed?.id;
  const nowFeature = nowPlayingId ? features.find((item) => item.id === nowPlayingId) : null;

  return {
    trackTitle: base.trackTitle || base.topAlbum || '',
    artistName: base.artistName || '',
    albumTitle: base.albumTitle || '',
    albumArtUrl: base.albumArtUrl || spotifyProfile?.currentTrack?.albumArt || '',
    isNowPlaying: Boolean(base.isNowPlaying),
    lastPlayedTimestamp: base.lastPlayedTimestamp || '',
    trackDuration: Number(base.trackDuration) || 0,
    trackTags: base.trackTags || (base.topGenre ? [base.topGenre] : []),
    playCount: Number(base.playCount) || 1,
    artistPlayCount: Number(base.artistPlayCount) || 0,
    loved: Boolean(base.loved),
    scrobblesThisWeek: Number(base.scrobblesThisWeek) || 0,
    scrobblesAllTime: Number(base.scrobblesAllTime) || 0,
    topArtist: base.topArtist || '',
    topArtistPlays: Number(base.topArtistPlays) || 0,
    topGenre: base.topGenre || base.trackTags?.[0] || '',
    topAlbum: base.topAlbum || '',
    recentTracks: Array.isArray(base.recentTracks) ? base.recentTracks : [],
    topArtists: Array.isArray(base.topArtists) ? base.topArtists : [],
    listeningStreak: Number(base.listeningStreak) || 0,
    avgScrobblesPerDay: Number(base.avgScrobblesPerDay) || 0,
    bpm: Number(base.bpm) || Number(nowFeature?.tempo) || estimateBpmFromGenre(base.topGenre || 'rock'),
    key: base.key,
    energy: Number(base.energy ?? nowFeature?.energy ?? spotifyProfile?.mood?.energy) || undefined,
    valence: Number(base.valence ?? nowFeature?.valence ?? spotifyProfile?.mood?.valence) || undefined,
    mood: spotifyProfile?.mood || base.mood || null,
    progressMs: Number(base.progressMs) || Number(spotifyProfile?.currentTrack?.progressMs) || 0,
    trackDurationMs: Number(base.trackDurationMs)
      || Number(spotifyProfile?.currentTrack?.durationMs)
      || Number(base.trackDuration)
      || 0,
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

    try {
      const username = import.meta.env.PUBLIC_LASTFM_USERNAME as string | undefined;
      if (!username) return null;

      const [recentTrack, recentTracks, topArtists, userInfo] = await Promise.all([
        getRecentTrack(username),
        getRecentTracks(username, 120),
        getUserTopArtists(username, '7day', 5),
        getUserInfo(username),
      ]);

      if (!recentTrack) return null;

      const trackInfo = await getTrackInfo(recentTrack.artist, recentTrack.name);
      const tags = (trackInfo?.tags || []).filter((tag) => tag.toLowerCase() !== 'unknown');
      const primaryGenre = tags[0] || 'electronic';
      const bpm = trackInfo?.bpm || estimateBpmFromGenre(primaryGenre);

      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const nonNowTracks = recentTracks.filter((track) => Boolean(track.scrobbledAt));
      const weekScrobbles = nonNowTracks.filter((track) => Date.parse(track.scrobbledAt || '') >= weekAgo).length;

      const days = new Set(nonNowTracks.map((track) => (track.scrobbledAt || '').slice(0, 10)).filter(Boolean));
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 400; i += 1) {
        const dayKey = cursor.toISOString().slice(0, 10);
        if (days.has(dayKey)) {
          streak += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
          break;
        }
      }

      const registeredAt = Date.parse(userInfo?.registeredAt || '') || Date.now();
      const lifetimeDays = Math.max(1, (Date.now() - registeredAt) / (1000 * 60 * 60 * 24));
      const allTime = userInfo?.playCount || 0;
      const avgPerDay = allTime / lifetimeDays;

      const dominantColor = recentTrack.albumArtUrl ? await extractDominantColor(recentTrack.albumArtUrl) : null;
      const renderData = mergeRenderData({
        trackTitle: recentTrack.name,
        artistName: recentTrack.artist,
        albumTitle: recentTrack.album,
        albumArtUrl: recentTrack.albumArtUrl,
        isNowPlaying: recentTrack.isNowPlaying,
        lastPlayedTimestamp: recentTrack.scrobbledAt,
        trackDuration: trackInfo?.duration || 0,
        trackTags: tags,
        playCount: trackInfo?.playCount || 1,
        loved: Boolean(trackInfo?.userLoved || recentTrack.loved),
        scrobblesThisWeek: weekScrobbles,
        scrobblesAllTime: allTime,
        topArtist: topArtists[0]?.name || recentTrack.artist,
        topArtistPlays: topArtists[0]?.playCount || 0,
        topGenre: primaryGenre,
        topAlbum: recentTrack.album,
        topArtists: topArtists.map((artist) => ({ artist: artist.name, plays: artist.playCount })),
        recentTracks: recentTracks.slice(0, 14).map((track) => ({
          title: track.name,
          artist: track.artist,
          albumArt: track.albumArtUrl,
          timestamp: track.scrobbledAt,
          loved: track.loved,
        })),
        listeningStreak: streak,
        avgScrobblesPerDay: avgPerDay,
        bpm,
      }, spotifyProfile, spotifyAudioFeatures);

      (window as any).__nucleusListeningData = {
        ...((window as any).__nucleusListeningData || {}),
        weeklyPlays: renderData.scrobblesThisWeek,
        streakDays: renderData.listeningStreak,
      };

      return {
        label: 'LISTENING',
        detail: `${recentTrack.name} – ${recentTrack.artist}`,
        link: '#consumption',
        updatedAt: recentTrack.scrobbledAt || new Date().toISOString(),
        accentOverride: dominantColor || undefined,
        renderData,
      };
    } catch (error) {
      console.error('[Nucleus] Listening slide data fetch failed.', error);
      return null;
    }
  },

  render(ctx, width, height, frame, data, theme) {
    const renderData = mergeRenderData((data?.renderData || {}) as Partial<ListeningRenderData>, null, null);
    if (renderData.albumArtUrl) loadAlbumArt(renderData.albumArtUrl);

    const palette = resolveGenrePalette(renderData.trackTags.length ? renderData.trackTags : [renderData.topGenre], data?.accentOverride || theme.accent);
    const p1 = parseHex(palette.primary);
    const p2 = parseHex(palette.secondary);
    const energy = clamp(renderData.energy ?? renderData.mood?.energy ?? 0.45, 0, 1);
    const valence = clamp(renderData.valence ?? renderData.mood?.valence ?? 0.5, 0, 1);
    const bpm = renderData.bpm || renderData.mood?.tempo || 110;

    ctx.clearRect(0, 0, width, height);
    drawBackgroundAtmosphere(ctx, width, height, frame, p1, p2, valence, energy, bpm);
    drawAlbumArtLayer(ctx, width, height, frame, p1, p2, renderData.isNowPlaying, renderData.lastPlayedTimestamp);
    drawWaveform(ctx, width, height, frame, p1, p2, bpm, energy);
    drawTrackInfo(ctx, width, height, frame, renderData, p1, p2);
    drawTimeline(ctx, width, height, renderData);
    drawBottomStats(ctx, width, height, renderData, p1, p2);

    metadataFadeFrame += 1;
  },

  reset() {
    metadataFadeFrame = 0;
  },
};
