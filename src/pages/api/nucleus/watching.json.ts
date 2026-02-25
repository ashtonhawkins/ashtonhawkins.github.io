import type { APIRoute } from 'astro';
import feeds from '@data/feeds-cache.json';
import { fetchLatestFilm } from '@lib/letterboxd';
import { fetchLatestTVShow } from '@lib/trakt';

interface RecentWatch {
  title: string;
  rating: number | null;
  genre: string | null;
  posterUrl: string | null;
}

interface WatchingAggregateStats {
  filmsThisYear: number;
  lifetimeFilms: number;
  averageRating: number;
  topDecade: string;
  topGenres: string[];
  recentWatches: RecentWatch[];
}

interface WatchingRenderData {
  type: 'film' | 'tv';
  title: string;
  year: number;
  rating: number | null;
  director: string | null;
  cast: string[];
  genres: string[];
  runtime: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  posterUrl?: string | null;
  watchedDate?: string;
  aggregate: WatchingAggregateStats;
}

interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: WatchingRenderData;
}

const computeAggregate = (): WatchingAggregateStats => {
  const recentItems = ((feeds as any)?.watching?.recentItems ?? []) as Array<Record<string, any>>;
  const stats = ((feeds as any)?.watching?.stats ?? {}) as Record<string, any>;
  const currentYear = new Date().getFullYear();

  const filmsThisYear = recentItems.filter((item) => item?.watchedDate && new Date(item.watchedDate).getFullYear() === currentYear).length;
  const lifetimeFilms = Number(stats.totalFilms ?? recentItems.length ?? 0);
  const averageRating = Number(stats.avgRating ?? 0);

  const decadeCounts = recentItems.reduce((acc, item) => {
    const year = Number(item?.year ?? 0);
    if (!year) return acc;
    const decade = `${Math.floor(year / 10) * 10}s`;
    acc[decade] = (acc[decade] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '----';

  const genreCounts = recentItems.reduce((acc, item) => {
    const genres = Array.isArray(item?.genres) ? item.genres : [];
    genres.forEach((genre: string) => {
      const key = String(genre).toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([genre]) => genre);

  const recentWatches: RecentWatch[] = recentItems.slice(0, 8).map((item) => ({
    title: String(item?.title ?? item?.displayTitle ?? 'Untitled'),
    rating: typeof item?.rating === 'number' ? item.rating : null,
    genre: Array.isArray(item?.genres) && item.genres.length ? String(item.genres[0]) : null,
    posterUrl: typeof item?.posterUrl === 'string' ? item.posterUrl : null
  }));

  return {
    filmsThisYear,
    lifetimeFilms,
    averageRating,
    topDecade,
    topGenres,
    recentWatches
  };
};

function buildFilmSlide(film: Awaited<ReturnType<typeof fetchLatestFilm>>, aggregate: WatchingAggregateStats): SlideData | null {
  if (!film || !film.year) {
    return null;
  }

  return {
    label: 'WATCHING',
    detail: `${film.title} – ${film.year}`,
    link: '#consumption',
    updatedAt: film.watchedAt,
    renderData: {
      type: 'film',
      title: film.title,
      year: film.year,
      rating: film.rating,
      director: null,
      cast: [],
      genres: aggregate.topGenres,
      runtime: 120,
      posterUrl: film.posterUrl,
      watchedDate: film.watchedAt,
      aggregate
    }
  };
}

function buildTVSlide(tv: Awaited<ReturnType<typeof fetchLatestTVShow>>, aggregate: WatchingAggregateStats): SlideData | null {
  if (!tv || !tv.year) {
    return null;
  }

  return {
    label: 'WATCHING',
    detail: `${tv.title} – ${tv.year}`,
    link: '#consumption',
    updatedAt: tv.watchedAt,
    renderData: {
      type: 'tv',
      title: tv.title,
      year: tv.year,
      rating: null,
      director: null,
      cast: tv.cast,
      genres: tv.genres,
      runtime: tv.runtime,
      season: tv.season,
      episode: tv.episode,
      episodeTitle: tv.episodeTitle,
      watchedDate: tv.watchedAt,
      aggregate
    }
  };
}

export const GET: APIRoute = async () => {
  const letterboxdUsername = import.meta.env.PUBLIC_LETTERBOXD_USERNAME;
  const traktUsername = import.meta.env.TRAKT_USERNAME;
  const traktClientId = import.meta.env.TRAKT_CLIENT_ID;
  const aggregate = computeAggregate();

  if (!letterboxdUsername) {
    console.error('[Nucleus] Missing PUBLIC_LETTERBOXD_USERNAME for watching route.');
  }

  if (!traktUsername || !traktClientId) {
    console.error('[Nucleus] Missing TRAKT_USERNAME or TRAKT_CLIENT_ID for watching route.');
  }

  const [filmResult, tvResult] = await Promise.allSettled([
    fetchLatestFilm(letterboxdUsername),
    fetchLatestTVShow(traktUsername, traktClientId)
  ]);

  const filmSlide = filmResult.status === 'fulfilled' ? buildFilmSlide(filmResult.value, aggregate) : null;
  const tvSlide = tvResult.status === 'fulfilled' ? buildTVSlide(tvResult.value, aggregate) : null;

  if (filmResult.status === 'fulfilled' && !filmSlide) {
    console.error('[Nucleus] Letterboxd source returned no usable film payload.', filmResult.value);
  }

  if (tvResult.status === 'fulfilled' && !tvSlide) {
    console.error('[Nucleus] Trakt source returned no usable TV payload.', tvResult.value);
  }

  if (filmResult.status === 'rejected') {
    console.error('[Nucleus] Film source failed.', filmResult.reason);
  }

  if (tvResult.status === 'rejected') {
    console.error('[Nucleus] TV source failed.', tvResult.reason);
  }

  const selected = (() => {
    if (!filmSlide && !tvSlide) {
      return null;
    }

    if (!filmSlide) {
      return tvSlide;
    }

    if (!tvSlide) {
      return filmSlide;
    }

    const filmTime = new Date(filmSlide.updatedAt).getTime();
    const tvTime = new Date(tvSlide.updatedAt).getTime();

    return filmTime > tvTime ? filmSlide : tvSlide;
  })();

  if (!selected) {
    console.error('[Nucleus] Watching route returned null after evaluating Letterboxd and Trakt data.');
  }

  return new Response(JSON.stringify(selected), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
};
