import type { APIRoute } from 'astro';
import { fetchLatestFilm } from '@lib/letterboxd';
import { fetchLatestTVShow } from '@lib/trakt';

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
}

interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  renderData: WatchingRenderData;
}

function buildFilmSlide(film: Awaited<ReturnType<typeof fetchLatestFilm>>): SlideData | null {
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
      genres: [],
      runtime: 0
    }
  };
}

function buildTVSlide(tv: Awaited<ReturnType<typeof fetchLatestTVShow>>): SlideData | null {
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
      episodeTitle: tv.episodeTitle
    }
  };
}

export const GET: APIRoute = async () => {
  const letterboxdUsername = import.meta.env.PUBLIC_LETTERBOXD_USERNAME;
  const traktUsername = import.meta.env.TRAKT_USERNAME;
  const traktClientId = import.meta.env.TRAKT_CLIENT_ID;

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

  const filmSlide = filmResult.status === 'fulfilled' ? buildFilmSlide(filmResult.value) : null;
  const tvSlide = tvResult.status === 'fulfilled' ? buildTVSlide(tvResult.value) : null;

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
