// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
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
  image: {
    service: passthroughImageService()
  },
  adapter: cloudflare({
    imageService: 'compile'
  })
});