export type WatchingRenderData = {
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
};

type RenderParams = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frame: number;
  accent: string;
  renderData: WatchingRenderData;
  ratingScale?: 'letterboxd' | 'trakt' | 5 | 10;
};

const drawYearStamp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  year: number
) => {
  const drift = Math.sin(frame * 0.0001) * 5;
  const fontSize = width < 420 ? 50 : 80;

  ctx.save();
  ctx.font = `bold ${fontSize}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.04;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(year), width * 0.35 + drift, height * 0.55);
  ctx.restore();
};

const drawRuntimeBar = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  runtime: number
) => {
  const barWidth = width * 0.7;
  const barStartX = (width - barWidth) / 2;
  const barY = height - 30;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;

  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.moveTo(barStartX, barY);
  ctx.lineTo(barStartX + barWidth, barY);
  ctx.stroke();

  if (runtime > 0) {
    const tickSpacing = barWidth * (30 / runtime);
    if (tickSpacing > 1) {
      ctx.globalAlpha = 0.2;
      for (let x = barStartX; x <= barStartX + barWidth + 0.1; x += tickSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, barY - 2);
        ctx.lineTo(x, barY + 2);
        ctx.stroke();
      }
    }
  }

  const pulseProgress = (frame * 0.0005) % 1;
  const dotX = barStartX + pulseProgress * barWidth;

  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(dotX, barY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const buildCreditLines = (renderData: WatchingRenderData): Array<{ text: string; header?: boolean; sectionBreak?: boolean }> => {
  const lines: Array<{ text: string; header?: boolean; sectionBreak?: boolean }> = [];

  if (renderData.type === 'tv') {
    lines.push({ text: `SEASON ${renderData.season ?? '—'}`, header: true });
    lines.push({ text: `EPISODE ${renderData.episode ?? '—'}`, header: true });
    lines.push({ text: `"${renderData.episodeTitle ?? 'UNTITLED'}"` });
    lines.push({ text: '', sectionBreak: true });
  } else {
    lines.push({ text: 'DIRECTED BY', header: true });
    lines.push({ text: renderData.director ?? 'UNKNOWN' });
    lines.push({ text: '', sectionBreak: true });
  }

  lines.push({ text: 'STARRING', header: true });

  if (renderData.cast.length === 0) {
    lines.push({ text: 'CAST UNAVAILABLE' });
  } else {
    renderData.cast.forEach((person) => lines.push({ text: person }));
  }

  lines.push({ text: '', sectionBreak: true });
  lines.push({ text: renderData.genres.slice(0, 3).join(' · ') || 'UNCLASSIFIED' });
  lines.push({ text: `${renderData.runtime} MIN` });

  return lines;
};

const drawRollingCredits = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  accent: string,
  renderData: WatchingRenderData
) => {
  const lines = buildCreditLines(renderData);
  const scroll = frame * 0.015;
  const startX = width * 0.42;
  const maxWidth = width * 0.56;
  const topY = 14;

  const sectionGap = 30;
  const lineGap = 18;

  const offsets: number[] = [];
  let totalHeight = 0;
  for (const line of lines) {
    offsets.push(totalHeight);
    totalHeight += line.sectionBreak ? sectionGap : lineGap;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(startX, 0, maxWidth, height);
  ctx.clip();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    const y = ((topY + offsets[index] - scroll) % totalHeight + totalHeight) % totalHeight;

    if (y < -20 || y > height + 25 || !line.text) {
      return;
    }

    if (line.header) {
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.25;
    } else {
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.4;
    }

    ctx.fillText(line.text, startX + 8, y);
  });

  ctx.restore();
};

const drawCountdownLeader = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  accent: string
) => {
  const cx = 45;
  const cy = 45;
  const radius = 25;
  const angle = frame * 0.003;

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;

  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.moveTo(cx - radius - 8, cy);
  ctx.lineTo(cx + radius + 8, cy);
  ctx.moveTo(cx, cy - radius - 8);
  ctx.lineTo(cx, cy + radius + 8);
  ctx.stroke();

  ctx.globalAlpha = 0.1;
  for (let deg = 0; deg < 360; deg += 30) {
    const theta = (deg * Math.PI) / 180;
    const innerX = cx + Math.cos(theta) * (radius - 2);
    const innerY = cy + Math.sin(theta) * (radius - 2);
    const outerX = cx + Math.cos(theta) * (radius + 4);
    const outerY = cy + Math.sin(theta) * (radius + 4);
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  ctx.stroke();

  ctx.restore();
};

const drawRating = (
  ctx: CanvasRenderingContext2D,
  height: number,
  accent: string,
  rating: number | null,
  ratingScale: RenderParams['ratingScale']
) => {
  const scale = ratingScale === 10 || ratingScale === 'trakt' ? 10 : 5;
  const value = rating == null ? '—' : Number(rating).toFixed(scale === 10 ? 1 : 1);
  const text = rating == null ? '★ —' : `★ ${value} / ${scale}`;

  ctx.save();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accent;
  ctx.fillText('★', 16, height - 42);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = accent;
  ctx.fillText(text.slice(1), 24, height - 42);
  ctx.restore();
};

export const render = ({
  ctx,
  width,
  height,
  frame,
  accent,
  renderData,
  ratingScale = 'letterboxd'
}: RenderParams) => {
  drawYearStamp(ctx, width, height, frame, accent, renderData.year);
  drawRuntimeBar(ctx, width, height, frame, accent, renderData.runtime);
  drawRollingCredits(ctx, width, height, frame, accent, renderData);
  drawCountdownLeader(ctx, frame, accent);
  drawRating(ctx, height, accent, renderData.rating, ratingScale);
};

export default { render };
