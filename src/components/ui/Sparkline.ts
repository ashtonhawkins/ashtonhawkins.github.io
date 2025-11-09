export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const Sparkline = ({ values, width = 120, height = 32, stroke = "currentColor" }: SparklineProps) => {
  if (!values || values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const normalized = (value - min) / span;
      const y = height - normalized * height;
      return `${x},${clamp(y, 0, height)}`;
    })
    .join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false" role="img"><polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};

export default Sparkline;
