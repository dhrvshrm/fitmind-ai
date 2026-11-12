import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the installable-app icons (192, 512, maskable, Apple touch) from
// public/favicon.svg. Run `npm run generate-pwa-assets` after changing the logo.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
});
