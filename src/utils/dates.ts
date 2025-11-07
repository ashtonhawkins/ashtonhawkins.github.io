export const formatRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const intl = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
  return `${intl.format(startDate)} – ${intl.format(endDate)}`;
};

export const approxYears = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  const years = diff / (1000 * 60 * 60 * 24 * 365.25);
  const rounded = Math.round(years * 10) / 10;
  return `~${rounded} years`;
};

export const sinceToNow = (start: string) => {
  const startDate = new Date(start);
  const now = new Date();
  const diff = now.getTime() - startDate.getTime();
  const years = diff / (1000 * 60 * 60 * 24 * 365.25);
  const rounded = Math.round(years * 10) / 10;
  return `~${rounded} years`;
};
