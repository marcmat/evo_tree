import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import pkg from './package.json';

// Version shown in the footer. CI stamps VITE_APP_VERSION as `<pkg version>+<short sha>`
// so a live page can be traced back to the exact commit that produced it; local builds
// fall back to package.json alone.
const appVersion = process.env.VITE_APP_VERSION?.trim() || pkg.version;

// `base` is relative by default (works on Cloudflare Pages and when previewed locally).
// For a GitHub Pages *project* site set VITE_BASE=/<repo>/ in the build step.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [svelte()],
  build: { target: 'es2022' },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
