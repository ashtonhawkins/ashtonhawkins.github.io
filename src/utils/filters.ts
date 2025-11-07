const normalize = (value: string) => value.trim().toLowerCase();

export const parseTags = (value?: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => normalize(tag))
    .filter(Boolean);
};

export const toggleTag = (current: string[], tag: string) => {
  const normalized = normalize(tag);
  if (current.includes(normalized)) {
    return current.filter((item) => item !== normalized);
  }
  return [...current, normalized];
};

export const serializeTags = (tags: string[]) =>
  tags
    .map((tag) => normalize(tag))
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .sort()
    .join(",");

export const matchesAnyTag = (itemTags: string[] = [], selected: string[] = []) => {
  if (!selected.length) return true;
  const normalizedItemTags = itemTags.map((tag) => normalize(tag));
  return selected.some((tag) => normalizedItemTags.includes(normalize(tag)));
};
