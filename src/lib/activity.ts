export type GithubActivity = {
  source: "github";
  type?: string | null;
  repo?: string | null;
  title?: string | null;
  url?: string | null;
  createdAt?: string | null;
};

export type RssActivity = {
  source: "rss";
  title?: string | null;
  url?: string | null;
  createdAt?: string | null;
  feedTitle?: string | null;
};

export type LastFmActivity = {
  source: "lastfm";
  artist?: string | null;
  track?: string | null;
  url?: string | null;
  createdAt?: string | null;
};

export type RawActivity = GithubActivity | RssActivity | LastFmActivity;

export type ActivityCategory = "github" | "reading" | "music";

export type NormalizedActivity = {
  id: string;
  category: ActivityCategory;
  title: string;
  description?: string;
  createdAt: string;
  url: string | null;
};

const SOURCE_CATEGORY_MAP: Record<RawActivity["source"], ActivityCategory> = {
  github: "github",
  rss: "reading",
  lastfm: "music"
};

const SOURCE_TITLE_FALLBACK: Record<ActivityCategory, string> = {
  github: "GitHub activity",
  reading: "Reading",
  music: "Listening"
};

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function normalizeActivity(raw: unknown): NormalizedActivity[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: NormalizedActivity[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const typed = item as RawActivity;
    if (!typed.source || !(typed.source in SOURCE_CATEGORY_MAP)) {
      return;
    }

    const category = SOURCE_CATEGORY_MAP[typed.source];
    const isoDate = toIsoDate(typed.createdAt ?? null);
    if (!isoDate) {
      return;
    }

    let title = "";
    let description: string | undefined;
    let url: string | null = null;

    switch (typed.source) {
      case "github": {
        title = (typed.title ?? typed.type ?? undefined) ?? SOURCE_TITLE_FALLBACK[category];
        description = typed.repo ?? undefined;
        url = typeof typed.url === "string" ? typed.url : null;
        break;
      }
      case "rss": {
        title = typed.title ?? typed.url ?? SOURCE_TITLE_FALLBACK[category];
        description = typed.feedTitle ?? undefined;
        url = typeof typed.url === "string" ? typed.url : null;
        break;
      }
      case "lastfm": {
        const track = typed.track ?? undefined;
        const artist = typed.artist ?? undefined;
        title = track ?? SOURCE_TITLE_FALLBACK[category];
        description = artist ?? undefined;
        url = typeof typed.url === "string" ? typed.url : null;
        break;
      }
      default:
        return;
    }

    const safeTitle = title && typeof title === "string" ? title : SOURCE_TITLE_FALLBACK[category];
    const baseId = `${category}-${isoDate}-${slugify(safeTitle) || "item"}`;
    const id = `${baseId}-${index}`;

    normalized.push({
      id,
      category,
      title: safeTitle,
      description,
      createdAt: isoDate,
      url
    });
  });

  return normalized.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
