export interface BulletGraphOptions {
  width?: number;
  height?: number;
}

export interface BulletGraphData {
  width: number;
  height: number;
  trackWidth: number;
  baselineX: number;
  targetWidth: number;
}

export const getBulletGraphData = (values: number[], options: BulletGraphOptions = {}): BulletGraphData => {
  const width = options.width ?? 120;
  const height = options.height ?? 24;
  if (!values.length) {
    return { width, height, trackWidth: width, baselineX: 0, targetWidth: 0 };
  }
  const baseline = values[0];
  const target = values[values.length - 1];
  const max = Math.max(...values, 0.0001);
  const baselineX = Math.min(width, Math.max(0, (baseline / max) * width));
  const targetWidth = Math.min(width, Math.max(0, (target / max) * width));
  return { width, height, trackWidth: width, baselineX, targetWidth };
};
