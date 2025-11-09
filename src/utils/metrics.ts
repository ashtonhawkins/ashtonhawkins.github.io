const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const preciseFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const meetsMetricGate = (metric: { sample?: number; confidence?: string | null }) => {
  if (typeof metric.sample === "number" && metric.sample >= 1000) return true;
  if (metric.confidence) return true;
  return false;
};

export const formatSample = (sample?: number) => {
  if (typeof sample !== "number" || Number.isNaN(sample)) return "";
  return `${compactFormatter.format(sample)} sample${sample === 1 ? "" : "s"}`;
};

export const formatDelta = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  const magnitude = Math.abs(value);
  if (magnitude >= 10) return `${sign}${numberFormatter.format(magnitude)}`;
  if (magnitude >= 1) return `${sign}${magnitude.toFixed(1)}`;
  return `${sign}${magnitude.toFixed(2)}`;
};

export const formatBaseline = (baseline?: number) => {
  if (typeof baseline !== "number" || Number.isNaN(baseline)) return "";
  if (baseline === 0) return "Baseline n/a";
  if (baseline < 1) return `Baseline ${baseline}`;
  if (baseline < 10) return `Baseline ${baseline.toFixed(1)}`;
  return `Baseline ${numberFormatter.format(baseline)}`;
};

export const inferSuffix = (item: { suffix?: string; label?: string }) => {
  if (item.suffix) return item.suffix;
  const label = item.label?.toLowerCase() ?? "";
  if (label.includes("pp")) return " pp";
  if (label.includes("%") || label.includes("lift") || label.includes("rate") || label.includes("delta")) return "%";
  return "";
};

export const formatKpiValue = (value: number, suffix = "") => {
  if (!Number.isFinite(value)) return suffix ? `0${suffix}` : "0";
  const decimals = Math.abs(value) < 10 ? 1 : 0;
  return `${preciseFormatter.format(Number(value.toFixed(decimals)))}${suffix}`;
};
