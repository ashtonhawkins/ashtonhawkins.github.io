export interface BulletGraphProps {
  values: number[];
  width?: number;
  height?: number;
}

export const BulletGraph = ({ values, width = 140, height = 24 }: BulletGraphProps) => {
  if (!values || values.length === 0) return "";
  const [baseline = 0, target = baseline, actual = target] = values;
  const max = Math.max(baseline, target, actual, 1);
  const baselineWidth = Math.max(0, Math.min(width, (baseline / max) * width));
  const actualWidth = Math.max(0, Math.min(width, (actual / max) * width));
  const targetX = Math.max(0, Math.min(width, (target / max) * width));
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false" role="img"><rect x="0" y="${height / 4}" width="${width}" height="${height / 2}" rx="${height / 4}" fill="currentColor" opacity="0.1"/><rect x="0" y="${height / 3}" width="${baselineWidth}" height="${height / 3}" rx="${height / 6}" fill="currentColor" opacity="0.25"/><rect x="0" y="${height / 3}" width="${actualWidth}" height="${height / 3}" rx="${height / 6}" fill="currentColor"/><line x1="${targetX}" y1="${height / 4}" x2="${targetX}" y2="${(height * 3) / 4}" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/></svg>`;
};

export default BulletGraph;
