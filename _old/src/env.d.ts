/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_PAGEFIND_SEARCH_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
