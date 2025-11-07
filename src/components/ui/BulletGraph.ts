export const bulletMetrics = (values: number[]) => {
  const [baseline, variant] = values;
  const max = Math.max(...values);
  const scale = max === 0 ? 0 : (variant / max) * 100;
  const baseScale = max === 0 ? 0 : (baseline / max) * 100;
  return { baseline: baseScale, variant: scale };
};
