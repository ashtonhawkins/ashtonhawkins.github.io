const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
const yearFormatter = new Intl.DateTimeFormat("en", { year: "numeric" });

const toDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

export const formatPreciseRange = (start?: string | null, end?: string | null) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate && !endDate) return "";
  const startLabel = startDate ? `${monthFormatter.format(startDate)} ${yearFormatter.format(startDate)}` : "";
  const endLabel = endDate ? `${monthFormatter.format(endDate)} ${yearFormatter.format(endDate)}` : "Present";
  if (!startLabel) return endLabel;
  return `${startLabel} – ${endLabel}`;
};

const monthsBetween = (start?: string | null, end?: string | null) => {
  const startDate = toDate(start);
  const endDate = toDate(end) ?? new Date();
  if (!startDate) return 0;
  const diff = endDate.getTime() - startDate.getTime();
  if (diff <= 0) return 0;
  return diff / (1000 * 60 * 60 * 24 * 30.4375);
};

export const formatApproxDuration = (start?: string | null, end?: string | null) => {
  const months = monthsBetween(start, end);
  if (!months) return "~tenure";
  if (months < 12) {
    const rounded = Math.max(1, Math.round(months));
    return `~${rounded} month${rounded === 1 ? "" : "s"}`;
  }
  const years = months / 12;
  const roundedYears = Math.round(years * 10) / 10;
  const label = Number.isInteger(roundedYears) ? Math.round(roundedYears).toString() : roundedYears.toFixed(1);
  return `~${label} year${label === "1" ? "" : "s"}`;
};

export const durationYears = (start?: string | null, end?: string | null) => {
  const months = monthsBetween(start, end);
  if (!months) return 0;
  return Math.round((months / 12) * 10) / 10;
};
