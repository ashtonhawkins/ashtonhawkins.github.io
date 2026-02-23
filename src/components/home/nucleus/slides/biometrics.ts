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
  lastNightDate?: string | null;
  trend?: {
    sleepScores: number[];
    readinessScores: number[];
    hrvValues: number[];
    restingHR: number[];
    bodyTemp: number[];
    spo2Values: number[];
  };
};

// ── Timing ────────────────────────────────────────────────────────
const SCAN_DURATION = 8000; // ~8s for one full pass
const PAUSE_DURATION = 1000;
const FADE_DURATION = 500;
const CYCLE_DURATION = SCAN_DURATION + PAUSE_DURATION + FADE_DURATION;
const BREATHING_PERIOD = 4000; // 4s breathing cycle
const LABEL_STAGGER = 300; // ms between each label appearing
const SCRAMBLE_DURATION = 200; // ms of random character cycling
const HEADER_FADE_DELAY = 500; // header fades in 0.5s after slide visible

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
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>{}[]';

// ── Trend Calculation ─────────────────────────────────────────────

type TrendDir = 'up' | 'down' | 'neutral';

const computeTrend = (current: number, values: number[]): TrendDir => {
  if (!values.length) return 'neutral';
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return 'neutral';
  const pctDiff = ((current - avg) / Math.abs(avg)) * 100;
  if (pctDiff > 2) return 'up';
  if (pctDiff < -2) return 'down';
  return 'neutral';
};

const getTrendArrow = (dir: TrendDir): string => {
  if (dir === 'up') return '↑';
  if (dir === 'down') return '↓';
  return '→';
};

// For metrics where higher is better: up=green, down=red
// For metrics where lower is better (HR): up=red, down=green
const getTrendColor = (dir: TrendDir, higherIsBetter: boolean): string => {
  if (dir === 'neutral') return '';  // will use tertiary
  if (higherIsBetter) {
    return dir === 'up' ? 'rgba(100, 200, 120, 0.9)' : 'rgba(220, 100, 100, 0.9)';
  }
  return dir === 'up' ? 'rgba(220, 100, 100, 0.9)' : 'rgba(100, 200, 120, 0.9)';
};

// ── Date Formatting ───────────────────────────────────────────────

const formatDateHeader = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return '';
  }
};

// ── Body Silhouette ──────────────────────────────────────────────

const drawBodySilhouette = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bodyH: number,
  accent: string,
  scanProgress: number,
  breathingPhase: number
): void => {
  const scale = bodyH / 200;
  const breathAlpha = 0.05 * Math.sin(breathingPhase * Math.PI * 2);

  ctx.save();
  ctx.translate(cx, cy - bodyH * 0.5);
  ctx.scale(scale, scale);

  // Define body segments with their Y ranges (in local coords, 0-200)
  const segments: Array<{ path: () => void; yMin: number; yMax: number }> = [
    {
      // Head
      path: () => {
        ctx.beginPath();
        ctx.ellipse(0, 12, 10, 13, 0, 0, Math.PI * 2);
      },
      yMin: 0, yMax: 25,
    },
    {
      // Neck + Shoulders
      path: () => {
        ctx.beginPath();
        ctx.moveTo(-4, 25); ctx.lineTo(-4, 32);
        ctx.moveTo(4, 25); ctx.lineTo(4, 32);
        ctx.moveTo(-4, 32); ctx.lineTo(-30, 38);
        ctx.moveTo(4, 32); ctx.lineTo(30, 38);
      },
      yMin: 25, yMax: 40,
    },
    {
      // Arms
      path: () => {
        ctx.beginPath();
        ctx.moveTo(-30, 38); ctx.lineTo(-34, 80); ctx.lineTo(-32, 110);
        ctx.moveTo(30, 38); ctx.lineTo(34, 80); ctx.lineTo(32, 110);
      },
      yMin: 38, yMax: 110,
    },
    {
      // Torso
      path: () => {
        ctx.beginPath();
        ctx.moveTo(-28, 40); ctx.lineTo(-22, 90); ctx.lineTo(-18, 105);
        ctx.moveTo(28, 40); ctx.lineTo(22, 90); ctx.lineTo(18, 105);
      },
      yMin: 40, yMax: 105,
    },
    {
      // Hips
      path: () => {
        ctx.beginPath();
        ctx.moveTo(-18, 105); ctx.lineTo(-22, 112);
        ctx.moveTo(18, 105); ctx.lineTo(22, 112);
      },
      yMin: 105, yMax: 112,
    },
    {
      // Legs
      path: () => {
        ctx.beginPath();
        ctx.moveTo(-22, 112); ctx.lineTo(-20, 150); ctx.lineTo(-18, 185); ctx.lineTo(-22, 195);
        ctx.moveTo(22, 112); ctx.lineTo(20, 150); ctx.lineTo(18, 185); ctx.lineTo(22, 195);
        ctx.moveTo(-10, 112); ctx.lineTo(-10, 150); ctx.lineTo(-10, 185);
        ctx.moveTo(10, 112); ctx.lineTo(10, 150); ctx.lineTo(10, 185);
      },
      yMin: 112, yMax: 200,
    },
  ];

  for (const seg of segments) {
    seg.path();

    // Determine if scan line is near this segment
    const scanY200 = scanProgress * 200;
    const nearScan = scanY200 >= seg.yMin - 10 && scanY200 <= seg.yMax + 20;
    const distFromScan = nearScan
      ? 1 - Math.min(Math.abs(scanY200 - (seg.yMin + seg.yMax) / 2) / 30, 1)
      : 0;

    const baseAlpha = 0.12 + breathAlpha;
    const brightened = baseAlpha + distFromScan * 0.45;

    ctx.strokeStyle = withAlpha(accent, clamp01(brightened));
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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
  ctx.save();

  // Main line with glow
  ctx.strokeStyle = withAlpha(accent, 1);
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(width, scanY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = withAlpha(accent, 0.3);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(width, scanY);
  ctx.stroke();

  ctx.restore();
};

// ── Data Callouts ────────────────────────────────────────────────

interface Callout {
  label: string;
  value: string;
  unit: string;
  yPct: number;
  side: 'left' | 'right';
  trendDir: TrendDir;
  trendColor: string;
  orderIndex: number; // 0-5, controls boot-up sequence
}

const buildCallouts = (data: BiometricsRenderData): Callout[] => {
  const hasData = data.sleepScore > 0;
  const dash = '--';
  const trend = data.trend;

  const hrDir = trend ? computeTrend(data.restingHeartRate, trend.restingHR) : 'neutral';
  const hrvDir = trend ? computeTrend(data.hrv, trend.hrvValues) : 'neutral';
  const spo2Dir = trend ? computeTrend(data.spo2, trend.spo2Values) : 'neutral';
  const respDir = computeTrend(data.respiratoryRate, []); // no trend data for resp
  const tempDir = trend ? computeTrend(data.bodyTempDeviation, trend.bodyTemp) : 'neutral';
  const readyDir = trend ? computeTrend(data.readinessScore, trend.readinessScores) : 'neutral';

  return [
    {
      label: 'HR',
      value: hasData ? `${data.restingHeartRate}` : dash,
      unit: 'BPM',
      yPct: 0.28,
      side: 'left',
      trendDir: hrDir,
      trendColor: getTrendColor(hrDir, false), // lower HR is better
      orderIndex: 0,
    },
    {
      label: 'HRV',
      value: hasData ? `${data.hrv}` : dash,
      unit: 'MS',
      yPct: 0.40,
      side: 'left',
      trendDir: hrvDir,
      trendColor: getTrendColor(hrvDir, true),
      orderIndex: 1,
    },
    {
      label: 'SPO2',
      value: hasData ? `${data.spo2}` : dash,
      unit: '%',
      yPct: 0.30,
      side: 'right',
      trendDir: spo2Dir,
      trendColor: getTrendColor(spo2Dir, true),
      orderIndex: 2,
    },
    {
      label: 'RESP',
      value: hasData ? `${data.respiratoryRate}` : dash,
      unit: '/MIN',
      yPct: 0.42,
      side: 'right',
      trendDir: respDir,
      trendColor: getTrendColor(respDir, false),
      orderIndex: 3,
    },
    {
      label: 'TEMP',
      value: hasData
        ? `${data.bodyTempDeviation >= 0 ? '+' : ''}${data.bodyTempDeviation.toFixed(2)}°`
        : `${dash}°`,
      unit: 'DEV',
      yPct: 0.62,
      side: 'left',
      trendDir: tempDir,
      trendColor: getTrendColor(tempDir, false),
      orderIndex: 4,
    },
    {
      label: 'READINESS',
      value: hasData ? `${data.readinessScore}` : dash,
      unit: 'SCORE',
      yPct: 0.66,
      side: 'right',
      trendDir: readyDir,
      trendColor: getTrendColor(readyDir, true),
      orderIndex: 5,
    },
  ];
};

// Generate a scrambled string for boot-up effect
const getScrambledText = (length: number, seed: number): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SCRAMBLE_CHARS[Math.floor(((seed * (i + 1) * 7 + i * 13) % 1000) / 1000 * SCRAMBLE_CHARS.length) % SCRAMBLE_CHARS.length];
  }
  return result;
};

const drawCallout = (
  ctx: CanvasRenderingContext2D,
  callout: Callout,
  width: number,
  height: number,
  bodyLeft: number,
  bodyRight: number,
  accent: string,
  elapsed: number,
  reducedMotion: boolean
): void => {
  // Boot-up timing: each callout appears after LABEL_STAGGER * orderIndex ms
  const bootDelay = callout.orderIndex * LABEL_STAGGER;
  const calloutElapsed = elapsed - bootDelay;

  if (calloutElapsed < 0 && !reducedMotion) return;

  const y = height * callout.yPct;
  const isRight = callout.side === 'right';
  const anchorX = isRight ? bodyRight + 10 : bodyLeft - 10;
  const textX = isRight ? width * 0.77 : width * 0.23;
  const yOffset = isRight ? (callout.orderIndex % 2 ? -10 : 8) : (callout.orderIndex % 2 ? 8 : -10);
  const textY = y + yOffset;

  // Determine display text (scrambled vs resolved)
  let displayLabel = callout.label;
  let displayValue = `${callout.value} ${callout.unit}`;
  let showTrend = true;
  let opacity = 1;

  if (!reducedMotion && calloutElapsed < SCRAMBLE_DURATION) {
    // Scramble phase
    const progress = calloutElapsed / SCRAMBLE_DURATION;
    const seed = Math.floor(calloutElapsed * 7);
    const totalText = `${callout.label} ${callout.value} ${callout.unit}`;
    const resolvedCount = Math.floor(progress * totalText.length);
    const scrambled = getScrambledText(totalText.length, seed);
    const mixed = totalText.slice(0, resolvedCount) + scrambled.slice(resolvedCount);
    displayLabel = mixed.slice(0, callout.label.length);
    displayValue = mixed.slice(callout.label.length + 1);
    showTrend = false;
    opacity = 0.6 + progress * 0.4;
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // Connecting line
  const lineEndX = isRight ? textX - 10 : textX + ctx.measureText(`${displayLabel}  ${displayValue}`).width + 10;
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(anchorX, y);
  ctx.lineTo((anchorX + lineEndX) / 2, textY);
  ctx.lineTo(lineEndX, textY);
  ctx.stroke();

  ctx.fillStyle = withAlpha(accent, 0.85);
  ctx.beginPath();
  ctx.arc(anchorX, y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.font = `600 12px ${MONO_FONT}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = isRight ? 'right' : 'left';
  ctx.fillStyle = withAlpha(accent, 0.5);

  let curX = textX;
  const labelWidth = ctx.measureText(displayLabel + '  ').width;

  if (isRight) {
    // Draw from right: trend arrow + value + label
    let totalStr = `${displayLabel}  ${displayValue}`;
    if (showTrend && callout.trendDir !== 'neutral') {
      totalStr += ` ${getTrendArrow(callout.trendDir)}`;
    }
    ctx.fillStyle = withAlpha(accent, 0.5);
    ctx.fillText(displayLabel, textX, textY - 12);

    ctx.font = `600 14px ${MONO_FONT}`;
    ctx.fillStyle = withAlpha(accent, 0.9);
    const valX = textX - labelWidth;
    ctx.fillText(displayValue, valX, textY + 8);

    // Trend arrow
    if (showTrend && callout.trendDir !== 'neutral') {
      ctx.font = `700 20px ${MONO_FONT}`;
      const arrowX = valX - ctx.measureText(displayValue).width - 6;
      ctx.fillStyle = callout.trendColor || withAlpha(accent, 0.5);
      ctx.fillText(getTrendArrow(callout.trendDir), arrowX, textY + 8);
    }
  } else {
    // Draw from left: label + value + trend arrow
    ctx.fillStyle = withAlpha(accent, 0.5);
    ctx.fillText(displayLabel, curX, textY - 12);

    ctx.font = `600 14px ${MONO_FONT}`;
    ctx.fillStyle = withAlpha(accent, 0.9);
    curX += labelWidth;
    ctx.fillText(displayValue, curX, textY + 8);

    // Trend arrow
    if (showTrend && callout.trendDir !== 'neutral') {
      ctx.font = `700 20px ${MONO_FONT}`;
      curX += ctx.measureText(displayValue).width + 4;
      ctx.fillStyle = callout.trendColor || withAlpha(accent, 0.5);
      ctx.textAlign = 'left';
      ctx.fillText(getTrendArrow(callout.trendDir), curX, textY + 8);
    }
  }

  ctx.restore();
};

// ── Timestamp Header ─────────────────────────────────────────────

const drawTimestampHeader = (
  ctx: CanvasRenderingContext2D,
  _width: number,
  accent: string,
  dateStr: string | null | undefined,
  elapsed: number,
  reducedMotion: boolean
): void => {
  // Fade in after HEADER_FADE_DELAY
  let headerAlpha: number;
  if (reducedMotion) {
    headerAlpha = 1;
  } else {
    const fadeElapsed = elapsed - HEADER_FADE_DELAY;
    headerAlpha = fadeElapsed < 0 ? 0 : clamp01(fadeElapsed / 500);
  }

  if (headerAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = headerAlpha;

  // "LAST NIGHT" label
  ctx.font = `600 14px ${MONO_FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = withAlpha(accent, 0.4);
  ctx.fillText('LAST NIGHT', 12, 10);

  // Date below
  const formatted = formatDateHeader(dateStr);
  if (formatted) {
    ctx.fillStyle = withAlpha(accent, 0.6);
    ctx.font = `500 13px ${MONO_FONT}`;
    ctx.fillText(formatted, 12, 28);
  }

  ctx.restore();
};

// ── Ambient Details ──────────────────────────────────────────────

const drawAmbient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  _cycle: number
): void => {
  ctx.save();
  ctx.font = `8px ${MONO_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = withAlpha(accent, 0.4);

  // Top right
  ctx.textAlign = 'right';
  ctx.fillText('DIAGNOSTIC v2.1', width - 12, 10);
  ctx.fillText('OURA GEN4', width - 12, 22);

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
  const cy = height * 0.50;
  const bodyH = height * 0.68;
  const bodyLeft = cx - bodyH * 0.1;
  const bodyRight = cx + bodyH * 0.1;

  ctx.clearRect(0, 0, width, height);

  // Grid behind figure
  drawGrid(ctx, width * 0.2, height * 0.05, width * 0.6, height * 0.9, theme.border);

  // Calculate scan position
  let scanProgress: number;
  const breathingPhase = (elapsed % BREATHING_PERIOD) / BREATHING_PERIOD;

  if (reducedMotion) {
    scanProgress = 0.5;
    scanCycle = 1;
  } else {
    const cycleElapsed = elapsed % CYCLE_DURATION;

    if (cycleElapsed < SCAN_DURATION) {
      scanProgress = cycleElapsed / SCAN_DURATION;
    } else if (cycleElapsed < SCAN_DURATION + PAUSE_DURATION) {
      scanProgress = 1;
    } else {
      scanProgress = 1;
    }

    scanCycle = Math.floor(elapsed / CYCLE_DURATION) + 1;
  }

  const scanY = height * 0.04 + scanProgress * height * 0.92;

  // Draw body with scanned brightening + breathing
  drawBodySilhouette(ctx, cx, cy, bodyH, accent, scanProgress, breathingPhase);

  // Scan line
  if (!reducedMotion || scanProgress === 0.5) {
    drawScanLine(ctx, width, scanY, accent);
  }

  // Timestamp header (top-left) — fades in after delay
  drawTimestampHeader(ctx, width, accent, data.lastNightDate, elapsed, reducedMotion);

  // Data callouts with sequential boot-up animation
  const callouts = buildCallouts(data);
  for (const callout of callouts) {
    drawCallout(ctx, callout, width, height, bodyLeft, bodyRight, accent, elapsed, reducedMotion);
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
