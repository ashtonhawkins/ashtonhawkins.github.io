/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_LETTERBOXD_USERNAME?: string;
  readonly TRAKT_CLIENT_ID?: string;
  readonly TRAKT_USERNAME?: string;
  readonly STRAVA_CLIENT_ID?: string;
  readonly STRAVA_CLIENT_SECRET?: string;
  readonly STRAVA_REFRESH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
