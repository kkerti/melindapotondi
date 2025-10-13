/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly BREVO_API_KEY: string;
  readonly BREVO_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}