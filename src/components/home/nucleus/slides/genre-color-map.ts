export type GenrePalette = { primary: string; secondary: string };

export const GENRE_COLOR_MAP: Record<string, GenrePalette> = {
  'new wave': { primary: '#8B5CF6', secondary: '#06B6D4' },
  'synth-pop': { primary: '#8B5CF6', secondary: '#06B6D4' },
  'post-punk': { primary: '#312E81', secondary: '#991B1B' },
  darkwave: { primary: '#312E81', secondary: '#991B1B' },
  rock: { primary: '#D97706', secondary: '#1F2937' },
  alternative: { primary: '#D97706', secondary: '#1F2937' },
  electronic: { primary: '#10B981', secondary: '#1D4ED8' },
  house: { primary: '#10B981', secondary: '#1D4ED8' },
  'hip-hop': { primary: '#F59E0B', secondary: '#DB2777' },
  rap: { primary: '#F59E0B', secondary: '#DB2777' },
  'r&b': { primary: '#F59E0B', secondary: '#DB2777' },
  jazz: { primary: '#B8860B', secondary: '#1E3A5F' },
  classical: { primary: '#FFFBEB', secondary: '#7F1D1D' },
  folk: { primary: '#065F46', secondary: '#92400E' },
  acoustic: { primary: '#065F46', secondary: '#92400E' },
  ambient: { primary: '#0D9488', secondary: '#6B7280' },
  experimental: { primary: '#0D9488', secondary: '#6B7280' },
  pop: { primary: '#EC4899', secondary: '#3B82F6' },
  romance: { primary: '#FF2D6B', secondary: '#3B82F6' },
  drama: { primary: '#2D5BFF', secondary: '#1E293B' },
  thriller: { primary: '#FF8C00', secondary: '#312E81' },
  comedy: { primary: '#FFD700', secondary: '#EA580C' },
  horror: { primary: '#00FF41', secondary: '#111827' },
  'sci-fi': { primary: '#00FFFF', secondary: '#7C3AED' },
  scifi: { primary: '#00FFFF', secondary: '#7C3AED' },
  action: { primary: '#FF0000', secondary: '#991B1B' },
  documentary: { primary: '#C4A882', secondary: '#334155' },
  mystery: { primary: '#A24BFF', secondary: '#1E293B' },
  fantasy: { primary: '#4d9cff', secondary: '#0EA5E9' },
  animation: { primary: '#ff5fb2', secondary: '#6366F1' },
  crime: { primary: '#f25f5c', secondary: '#1F2937' },
};

const normalize = (value: string): string => value.toLowerCase().trim();

export const resolveGenrePalette = (genres: string[], fallback = '#74c6ff'): GenrePalette => {
  for (const genre of genres) {
    const normalized = normalize(genre);
    const exact = GENRE_COLOR_MAP[normalized];
    if (exact) return exact;
    const partial = Object.entries(GENRE_COLOR_MAP).find(([key]) => normalized.includes(key));
    if (partial) return partial[1];
  }
  return { primary: fallback, secondary: '#334155' };
};
