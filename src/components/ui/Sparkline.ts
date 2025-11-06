export interface SparklineOptions {
  width?: number;
  height?: number;
}

export interface SparklineData {
  width: number;
  height: number;
  points: string;
}

const buildPoints = (values: number[], width: number, height: number) => {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

export const getSparklineData = (values: number[], options: SparklineOptions = {}): SparklineData => {
  const width = options.width ?? 96;
  const height = options.height ?? 28;
  return { width, height, points: buildPoints(values, width, height) };
};
