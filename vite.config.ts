import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import pkg from './package.json';

// `base` is relative by default (works on Cloudflare Pages and when previewed locally).
// For a GitHub Pages *project* site set VITE_BASE=/<repo>/ in the build step.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [svelte()],
  build: { target: 'es2022' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
