import type { SlideData, SlideModule } from '../types';

export type BiometricsRenderData = {
  sleepScore: number;
  readinessScore: number;
  totalSleepMinutes: number;
  restingHeartRate: number;
  hrv: number;
  spo2: number;
  respiratoryRate: number;
  bodyTempDeviation: number;
  stressLevel: string;
  sleepStages: Array<{ stage: string; startOffset: number; endOffset: number }>;
};

const SCAN_DURATION = 8000;
const PAUSE_DURATION = 2000;
const FADE_DURATION = 500;
const CYCLE_DURATION = SCAN_DURATION + PAUSE_DURATION + FADE_DURATION;

let revealStart: number | null = null;
let scanCycle = 0;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const withAlpha = (color: string, alpha: number): string => {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith('rgb(')) {
    const values = color.replace(/[rgb()\s]/g, '').split(',').map(Number);
    return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
};

const MONO_FONT = '"IBM Plex Mono", "Courier New", monospace';

// ── Body Silhouette ──────────────────────────────────────────────

const drawBodySilhouette = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bodyH: number,
  accent: string,
  scannedProgress: number
): void => {
  const scale = bodyH / 200;

  ctx.save();
  ctx.translate(cx, cy - bodyH * 0.5);
  ctx.scale(scale, scale);

  // Head
  ctx.beginPath();
  ctx.ellipse(0, 12, 10, 13, 0, 0, Math.PI * 2);

  // Neck
  ctx.moveTo(-4, 25);
  ctx.lineTo(-4, 32);
  ctx.moveTo(4, 25);
  ctx.lineTo(4, 32);

  // Shoulders
  ctx.moveTo(-4, 32);
  ctx.lineTo(-30, 38);
  ctx.moveTo(4, 32);
  ctx.lineTo(30, 38);

  // Arms (left)
  ctx.moveTo(-30, 38);
  ctx.lineTo(-34, 80);
  ctx.lineTo(-32, 110);

  // Arms (right)
  ctx.moveTo(30, 38);
  ctx.lineTo(34, 80);
  ctx.lineTo(32, 110);

  // Torso sides
  ctx.moveTo(-28, 40);
  ctx.lineTo(-22, 90);
  ctx.lineTo(-18, 105);

  ctx.moveTo(28, 40);
  ctx.lineTo(22, 90);
  ctx.lineTo(18, 105);

  // Hips
  ctx.moveTo(-18, 105);
  ctx.lineTo(-22, 112);
  ctx.moveTo(18, 105);
  ctx.lineTo(22, 112);

  // Legs (left)
  ctx.moveTo(-22, 112);
  ctx.lineTo(-20, 150);
  ctx.lineTo(-18, 185);
  ctx.lineTo(-22, 195);

  // Legs (right)
  ctx.moveTo(22, 112);
  ctx.lineTo(20, 150);
  ctx.lineTo(18, 185);
  ctx.lineTo(22, 195);

  // Inner legs
  ctx.moveTo(-10, 112);
  ctx.lineTo(-10, 150);
  ctx.lineTo(-10, 185);

  ctx.moveTo(10, 112);
  ctx.lineTo(10, 150);
  ctx.lineTo(10, 185);

  const baseAlpha = 0.15 + scannedProgress * 0.10;
  ctx.strokeStyle = withAlpha(accent, baseAlpha);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
};

// ── Grid Overlay ─────────────────────────────────────────────────

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  border: string
): void => {
  ctx.save();
  ctx.strokeStyle = withAlpha(border, 0.08);
  ctx.lineWidth = 0.5;

  const spacing = 20;
  for (let gy = y; gy <= y + h; gy += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  for (let gx = x; gx <= x + w; gx += spacing) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  ctx.restore();
};

// ── Scan Line ────────────────────────────────────────────────────

const drawScanLine = (
  ctx: CanvasRenderingContext2D,
  width: number,
  scanY: number,
  accent: string
): void => {
  // Main line
  ctx.save();
  ctx.strokeStyle = withAlpha(accent, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(width, scanY);
  ctx.stroke();

  // Glow above and below
  const gradient = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
  gradient.addColorStop(0, withAlpha(accent, 0));
  gradient.addColorStop(0.5, withAlpha(accent, 0.2));
  gradient.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, scanY - 6, width, 12);

  ctx.restore();
};

// ── Data Callouts ────────────────────────────────────────────────

interface Callout {
  label: string;
  value: string;
  yPct: number;
  side: 'left' | 'right';
}

const buildCallouts = (data: BiometricsRenderData): Callout[] => {
  const hasData = data.sleepScore > 0;
  const dash = '--';

  // Build tiny sleep stage bar representation
  const sleepLabel = hasData ? `SLEEP ${data.sleepScore}` : `SLEEP ${dash}`;
  const hrLabel = hasData ? `HR ${data.restingHeartRate} BPM / HRV ${data.hrv}ms` : `HR ${dash} BPM / HRV ${dash}ms`;
  const spo2Label = hasData ? `SPO2 ${data.spo2}% / RESP ${data.respiratoryRate}` : `SPO2 ${dash}% / RESP ${dash}`;
  const readinessLabel = hasData ? `READINESS ${data.readinessScore}` : `READINESS ${dash}`;
  const tempDev = hasData
    ? `TEMP ${data.bodyTempDeviation >= 0 ? '+' : ''}${data.bodyTempDeviation.toFixed(2)}°`
    : `TEMP ${dash}°`;
  const recoveryLabel = hasData ? `RECOVERY: ${data.stressLevel.toUpperCase()}` : `RECOVERY: ${dash}`;

  return [
    { label: 'SLEEP', value: sleepLabel, yPct: 0.15, side: 'right' },
    { label: 'CARDIAC', value: hrLabel, yPct: 0.35, side: 'left' },
    { label: 'SPO2', value: spo2Label, yPct: 0.40, side: 'right' },
    { label: 'READINESS', value: readinessLabel, yPct: 0.50, side: 'left' },
    { label: 'THERMAL', value: tempDev, yPct: 0.55, side: 'left' },
    { label: 'RECOVERY', value: recoveryLabel, yPct: 0.85, side: 'right' },
  ];
};

const drawCallout = (
  ctx: CanvasRenderingContext2D,
  callout: Callout,
  width: number,
  height: number,
  bodyLeft: number,
  bodyRight: number,
  accent: string,
  opacity: number
): void => {
  if (opacity <= 0) return;

  const y = height * callout.yPct;
  const isRight = callout.side === 'right';
  const anchorX = isRight ? bodyRight + 4 : bodyLeft - 4;
  const textX = isRight ? width - 12 : 12;
  const lineEndX = isRight ? textX - 4 : textX + ctx.measureText(callout.value).width + 4;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Connecting line
  ctx.strokeStyle = withAlpha(accent, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(anchorX, y);
  ctx.lineTo(lineEndX, y);
  ctx.stroke();

  // Crosshair bracket at anchor
  const bSize = 4;
  ctx.strokeStyle = withAlpha(accent, 0.5);
  ctx.beginPath();
  ctx.moveTo(anchorX - bSize, y - bSize);
  ctx.lineTo(anchorX + bSize, y - bSize);
  ctx.lineTo(anchorX + bSize, y + bSize);
  ctx.lineTo(anchorX - bSize, y + bSize);
  ctx.closePath();
  ctx.stroke();

  // Text
  ctx.font = `9px ${MONO_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = isRight ? 'right' : 'left';
  ctx.fillStyle = withAlpha(accent, 0.8);
  ctx.fillText(callout.value, textX, y);

  ctx.restore();
};

// ── Ambient Details ──────────────────────────────────────────────

const drawAmbient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  cycle: number
): void => {
  ctx.save();
  ctx.font = `8px ${MONO_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = withAlpha(accent, 0.4);

  // Top right
  ctx.textAlign = 'right';
  ctx.fillText('DIAGNOSTIC v2.1', width - 12, 10);
  ctx.fillText('OURA GEN4', width - 12, 22);

  // Bottom left
  ctx.textAlign = 'left';
  ctx.fillText(`SCAN CYCLE ${cycle}`, 12, height - 18);

  // Measurement rules at body area top/bottom
  ctx.strokeStyle = withAlpha(accent, 0.08);
  ctx.lineWidth = 0.5;
  const ruleLeft = width * 0.25;
  const ruleRight = width * 0.75;

  ctx.beginPath();
  ctx.moveTo(ruleLeft, height * 0.04);
  ctx.lineTo(ruleRight, height * 0.04);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ruleLeft, height * 0.96);
  ctx.lineTo(ruleRight, height * 0.96);
  ctx.stroke();

  ctx.restore();
};

// ── Main Render ──────────────────────────────────────────────────

const renderBiometrics = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _frame: number,
  data: BiometricsRenderData,
  theme: { accent: string; border: string }
): void => {
  const accent = theme.accent;
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  if (revealStart === null) revealStart = performance.now();
  const elapsed = performance.now() - revealStart;

  const cx = width * 0.5;
  const cy = height * 0.52;
  const bodyH = height * 0.65;
  const bodyLeft = cx - bodyH * 0.1;
  const bodyRight = cx + bodyH * 0.1;

  ctx.clearRect(0, 0, width, height);

  // Grid behind figure
  drawGrid(ctx, width * 0.2, height * 0.05, width * 0.6, height * 0.9, theme.border);

  // Calculate scan position
  let scanProgress: number;
  let calloutOpacity: number;

  if (reducedMotion) {
    scanProgress = 0.5;
    calloutOpacity = 1;
    scanCycle = 1;
  } else {
    const cycleElapsed = elapsed % CYCLE_DURATION;

    if (cycleElapsed < SCAN_DURATION) {
      // Sweeping
      scanProgress = cycleElapsed / SCAN_DURATION;
      calloutOpacity = 1;
    } else if (cycleElapsed < SCAN_DURATION + PAUSE_DURATION) {
      // Paused at bottom
      scanProgress = 1;
      calloutOpacity = 1;
    } else {
      // Fading out, about to reset
      scanProgress = 1;
      calloutOpacity = 1 - (cycleElapsed - SCAN_DURATION - PAUSE_DURATION) / FADE_DURATION;
    }

    scanCycle = Math.floor(elapsed / CYCLE_DURATION) + 1;
  }

  const scanY = height * 0.04 + scanProgress * height * 0.92;

  // Draw body with scanned brightening
  drawBodySilhouette(ctx, cx, cy, bodyH, accent, scanProgress);

  // Scan line
  if (!reducedMotion || scanProgress === 0.5) {
    drawScanLine(ctx, width, scanY, accent);
  }

  // Data callouts - appear when scan reaches their Y position
  const callouts = buildCallouts(data);
  for (const callout of callouts) {
    const calloutY = callout.yPct;
    let co: number;
    if (reducedMotion) {
      co = 1;
    } else if (scanProgress >= calloutY) {
      // Fade in quickly once scan passes
      const fadeIn = clamp01((scanProgress - calloutY) * SCAN_DURATION / 200);
      co = fadeIn * calloutOpacity;
    } else {
      co = 0;
    }
    drawCallout(ctx, callout, width, height, bodyLeft, bodyRight, accent, co);
  }

  // Ambient labels
  drawAmbient(ctx, width, height, accent, scanCycle);
};

export const biometricsSlide: SlideModule = {
  id: 'biometrics',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/biometrics.json', {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Biometrics API returned ${response.status}`);
      }
      const data = (await response.json()) as SlideData | null;
      return data;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch biometrics data:', error);
      return null;
    }
  },

  reset(): void {
    revealStart = null;
  },

  render(ctx, width, height, frame, data, theme) {
    const renderData = (data?.renderData || {}) as BiometricsRenderData;
    renderBiometrics(ctx, width, height, frame, renderData, theme);
  }
};
