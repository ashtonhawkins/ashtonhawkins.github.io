/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_LASTFM_API_KEY: string;
  readonly PUBLIC_LASTFM_USERNAME: string;
  readonly PUBLIC_LETTERBOXD_USERNAME: string;
  readonly PUBLIC_GOODREADS_USER_ID: string;
  readonly TRAKT_USERNAME: string;
  readonly TRAKT_CLIENT_ID: string;
  readonly STRAVA_CLIENT_ID: string;
  readonly STRAVA_CLIENT_SECRET: string;
  readonly STRAVA_REFRESH_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
