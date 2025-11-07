export const buildSparkPath = (values: number[]) => {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = 100 / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = step * index;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
};
