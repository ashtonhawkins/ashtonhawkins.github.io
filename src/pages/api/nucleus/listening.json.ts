import type { APIRoute } from 'astro';
import { getRecentTrack, getTrackInfo, estimateBpmFromGenre } from '@lib/lastfm';

export const GET: APIRoute = async () => {
  const username = import.meta.env.PUBLIC_LASTFM_USERNAME;
  if (!username) {
    console.error('[Nucleus] Missing PUBLIC_LASTFM_USERNAME for listening route.');
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  try {
    const recentTrack = await getRecentTrack(username);
    if (!recentTrack) {
      console.error('[Nucleus] Last.fm returned no recent track.');
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const trackInfo = await getTrackInfo(recentTrack.artist, recentTrack.name);
    const genre = trackInfo?.tags?.[0] || 'unknown';
    const bpm = trackInfo?.bpm || estimateBpmFromGenre(genre);

    const data = {
      label: 'LISTENING',
      detail: `${recentTrack.name} – ${recentTrack.artist}`,
      link: '#consumption',
      updatedAt: recentTrack.scrobbledAt || new Date().toISOString(),
      renderData: {
        title: recentTrack.name,
        artist: recentTrack.artist,
        album: recentTrack.album,
        albumArtUrl: recentTrack.albumArtUrl,
        bpm,
        genre,
        duration: trackInfo?.duration || 0,
        isNowPlaying: recentTrack.isNowPlaying,
      },
    };

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    console.error('[Nucleus] Listening route failed.', error);
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
