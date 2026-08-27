// @ts-check
import { defineConfig, envField, passthroughImageService } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    locales: ["en", "hu"],
    defaultLocale: "hu",
    routing: {
        prefixDefaultLocale: false
    }
  },

  env: {
    schema: {
      BREVO_API_KEY: envField.string({context: 'server', access: 'secret'}),
      BREVO_API_URL: envField.string({context: 'server', access: 'public'}),
      VENDURE_SHOP_API_URL: envField.string({context: 'client', access: 'public'}),
      // Workshop ticket pages password gate (protects /workshops and /en/workshops).
      // Toggle off to make the workshop pages fully public without a code change.
      WORKSHOP_GATE_ENABLED: envField.boolean({context: 'server', access: 'public', default: true}),
      WORKSHOP_GATE_PASSWORD: envField.string({context: 'server', access: 'secret'}),
      WORKSHOP_GATE_COOKIE_SECRET: envField.string({context: 'server', access: 'secret'})
    }
  },

  adapter: cloudflare({
    imageService: 'compile'
  }),

  integrations: [svelte()]
});