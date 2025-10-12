// @ts-check
import { defineConfig, envField, passthroughImageService } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

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
      BREVO_API_URL: envField.string({context: 'server', access: 'public'})
    }
  },
  adapter: cloudflare({
    imageService: 'compile'
  })
});