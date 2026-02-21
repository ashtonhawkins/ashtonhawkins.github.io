import {
  estimateBpmFromGenre,
  extractDominantColor,
  getRecentTrack,
  getTrackInfo,
} from '@lib/lastfm';

export interface SlideData {
  label: string;
  detail: string;
  link: string;
  updatedAt: string;
  accentOverride?: string;
  renderData: Record<string, any>;
}

export const listeningSlide = {
  id: 'listening',
  async fetchData(): Promise<SlideData | null> {
    try {
      const username = import.meta.env.PUBLIC_LASTFM_USERNAME as string | undefined;
      if (!username) {
        console.error('[Nucleus] PUBLIC_LASTFM_USERNAME is missing.');
        return null;
      }

      const recentTrack = await getRecentTrack(username);
      if (!recentTrack) return null;

      const trackInfo = await getTrackInfo(recentTrack.artist, recentTrack.name);
      const dominantColor = recentTrack.albumArtUrl
        ? await extractDominantColor(recentTrack.albumArtUrl)
        : null;

      const genre = trackInfo?.tags?.[0] || 'unknown';
      const bpm = trackInfo?.bpm || estimateBpmFromGenre(genre);

      return {
        label: 'LISTENING',
        detail: `${recentTrack.name} – ${recentTrack.artist}`,
        link: '#consumption',
        updatedAt: recentTrack.scrobbledAt || new Date().toISOString(),
        accentOverride: dominantColor || undefined,
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
    } catch (error) {
      console.error('[Nucleus] Failed to fetch listening data:', error);
      return null;
    }
  },
};

export default listeningSlide;
