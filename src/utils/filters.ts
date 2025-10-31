export const parseTags = (value?: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

export const toggleTag = (current: string[], tag: string) => {
  const normalized = tag.toLowerCase();
  if (current.includes(normalized)) {
    return current.filter((item) => item !== normalized);
  }
  return [...current, normalized];
};

export const serializeTags = (tags: string[]) =>
  tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
