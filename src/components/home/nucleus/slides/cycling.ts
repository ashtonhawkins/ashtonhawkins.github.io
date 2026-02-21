import type { SlideData, SlideModule } from '../types';

export type CyclingRenderData = {
  distanceMi: number;
  elevationFt: number;
  avgSpeedMph: number;
  maxGradientPct: number | null;
  avgHeartRate: number | null;
  elevationProfile: number[];
  distanceStream: number[];
  routePolyline: [number, number][];
  routeName: string;
};

const REVEAL_DURATION = 2000;
let revealStart: number | null = null;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const withAlpha = (color: string, alpha: number): string => {
  if (color.startsWith('oklch(')) return color;
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

const drawRouteTrace = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  data: CyclingRenderData,
  accent: string,
  width: number,
  height: number
): void => {
  if (!data.routePolyline.length) return;

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  data.routePolyline.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  const rangeLat = Math.max(0.00001, maxLat - minLat);
  const rangeLng = Math.max(0.00001, maxLng - minLng);
  const targetW = width * 0.4;
  const targetH = height * 0.4;
  const scale = Math.min(targetW / rangeLng, targetH / rangeLat);
  const drawW = rangeLng * scale;
  const drawH = rangeLat * scale;
  const originX = 16 + (targetW - drawW) * 0.5;
  const originY = 16 + (targetH - drawH) * 0.5;
  const centerX = originX + drawW * 0.5;
  const centerY = originY + drawH * 0.5;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(frame * 0.0001);
  ctx.translate(-centerX, -centerY);

  ctx.strokeStyle = withAlpha(accent, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();

  data.routePolyline.forEach(([lat, lng], idx) => {
    const x = originX + ((lng - minLng) / rangeLng) * drawW;
    const y = originY + (1 - (lat - minLat) / rangeLat) * drawH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const [startLat, startLng] = data.routePolyline[0];
  const [endLat, endLng] = data.routePolyline[data.routePolyline.length - 1];
  const startX = originX + ((startLng - minLng) / rangeLng) * drawW;
  const startY = originY + (1 - (startLat - minLat) / rangeLat) * drawH;
  const endX = originX + ((endLng - minLng) / rangeLng) * drawW;
  const endY = originY + (1 - (endLat - minLat) / rangeLat) * drawH;

  ctx.fillStyle = '#58d68d';
  ctx.beginPath();
  ctx.arc(startX, startY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = withAlpha(accent, 0.8);
  ctx.beginPath();
  ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawElevation = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  reveal: number,
  data: CyclingRenderData,
  accent: string,
  width: number,
  height: number
): void => {
  const profile = data.elevationProfile;
  const areaTop = height * 0.4;
  const areaBottom = height * 0.95;
  const areaHeight = areaBottom - areaTop;

  if (!profile.length) {
    const y = areaTop + areaHeight * 0.5;
    ctx.strokeStyle = withAlpha(accent, 0.45);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillStyle = withAlpha(accent, 0.28);
    ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO DATA', width * 0.5, y - 8);
    return;
  }

  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const range = Math.max(0.0001, max - min);
  const maxIndex = Math.max(2, Math.floor(reveal * (profile.length - 1)) + 1);

  ctx.beginPath();
  for (let i = 0; i < maxIndex; i += 1) {
    const x = (i / (profile.length - 1 || 1)) * width;
    const t = (profile[i] - min) / range;
    const y = areaBottom - t * areaHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.lineTo(((maxIndex - 1) / (profile.length - 1 || 1)) * width, areaBottom);
  ctx.lineTo(0, areaBottom);
  ctx.closePath();
  ctx.fillStyle = withAlpha(accent, 0.05);
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < maxIndex; i += 1) {
    const x = (i / (profile.length - 1 || 1)) * width;
    const t = (profile[i] - min) / range;
    const y = areaBottom - t * areaHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  const glow = 4 + 2 * Math.sin(frame * 0.002);
  ctx.shadowColor = withAlpha(accent, 0.45);
  ctx.shadowBlur = reveal >= 1 ? glow : 0;
  ctx.strokeStyle = withAlpha(accent, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;
};

const drawTextLayers = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  reveal: number,
  data: CyclingRenderData,
  accent: string,
  width: number,
  height: number
): void => {
  const speedValue = data.avgSpeedMph * reveal;
  const distanceValue = data.distanceMi * reveal;

  ctx.textBaseline = 'top';

  ctx.fillStyle = withAlpha(accent, 0.4);
  ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${distanceValue.toFixed(1)} MI`, 16, Math.max(16 + height * 0.4 + 8, 84));

  ctx.fillStyle = withAlpha(accent, 0.5);
  ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(speedValue.toFixed(1), width - 16, 16);
  ctx.fillStyle = withAlpha(accent, 0.25);
  ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('MPH', width - 16, 38);

  if (data.maxGradientPct !== null) {
    ctx.fillStyle = withAlpha(accent, 0.35);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`▲ ${data.maxGradientPct.toFixed(1)}%`, width - 16, height * 0.48);
    ctx.fillStyle = withAlpha(accent, 0.2);
    ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('MAX GRADE', width - 16, height * 0.48 + 14);
  }

  if (data.avgHeartRate !== null) {
    const pulseCycle = (frame * (data.avgHeartRate / 60) * 0.001) % 1;
    const pulseAlpha = 0.2 + 0.15 * Math.sin(pulseCycle * 2 * Math.PI);

    ctx.textAlign = 'left';
    ctx.fillStyle = withAlpha(accent, pulseAlpha);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`♥ ${Math.round(data.avgHeartRate)}`, 16, height - 32);
    ctx.fillStyle = withAlpha(accent, 0.15);
    ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('AVG HR', 16, height - 18);
  }
};

export const cyclingSlide: SlideModule = {
  id: 'cycling',

  async fetchData(): Promise<SlideData | null> {
    try {
      const response = await fetch('/api/nucleus/cycling.json', {
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Cycling API returned ${response.status}`);
      }
      const data = (await response.json()) as SlideData | null;
      return data;
    } catch (error) {
      console.error('[Nucleus] Failed to fetch cycling data:', error);
      return null;
    }
  },

  reset(): void {
    revealStart = null;
  },

  render(ctx, width, height, frame, data, theme) {
    if (revealStart === null) revealStart = performance.now();
    const elapsed = performance.now() - revealStart;
    const reveal = clamp01(elapsed / REVEAL_DURATION);
    const easedReveal = 1 - Math.pow(1 - reveal, 3);

    const accent = theme.accent;
    const renderData = (data?.renderData || {}) as CyclingRenderData;

    ctx.clearRect(0, 0, width, height);
    drawRouteTrace(ctx, frame, renderData, accent, width, height);
    drawElevation(ctx, frame, easedReveal, renderData, accent, width, height);
    drawTextLayers(ctx, frame, easedReveal, renderData, accent, width, height);
  }
};