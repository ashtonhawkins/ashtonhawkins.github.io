/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_LETTERBOXD_USERNAME?: string;
  readonly TRAKT_CLIENT_ID?: string;
  readonly TRAKT_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
