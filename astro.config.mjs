// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import preact from '@astrojs/preact';

// El sitio público sigue prerenderizado; solo /admin corre en funciones de
// Vercel (cada página del panel declara `prerender = false`).
/** @param {{ optional?: boolean, default?: string }} [options] */
const secret = (options = {}) => envField.string({ context: 'server', access: 'secret', ...options });

export default defineConfig({
  adapter: vercel(),
  integrations: [preact()],
  env: {
    schema: {
      ADMIN_USERS: secret({ optional: true }),
      SESSION_SECRET: secret({ optional: true }),
      GITHUB_TOKEN: secret({ optional: true }),
      GITHUB_REPO: secret({ default: 'Asaply/AHH_web_demo' }),
      GITHUB_BRANCH: secret({ default: 'main' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
