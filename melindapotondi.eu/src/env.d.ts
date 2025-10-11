/// <reference path="../.astro/types.d.ts" />

// Environment variables interface for Brevo newsletter integration
interface ImportMetaEnv {
  readonly BREVO_API_KEY: string;
  readonly BREVO_LIST_IDS: string;
  readonly BREVO_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}