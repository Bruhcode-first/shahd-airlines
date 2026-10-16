import { defineConfig } from 'vite';

// GitHub Pages (and `vite preview`) serve the site from /shahd-airlines/, the dev server from /.
// VITE_CACHE_DIR lets several builders run Vite in parallel without sharing a dep cache.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/shahd-airlines/' : '/',
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // The lazy globe chunk (three + three-globe) is ~520KB gzip by design; it loads only near #globe.
    chunkSizeWarningLimit: 2000,
  },
}));
