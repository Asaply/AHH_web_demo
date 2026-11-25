import type { APIRoute } from 'astro';
import { github, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return json(await github().history('src/content', 10));
  } catch (error) {
    console.error('[admin] historial falló', error);
    return json({ error: 'No se pudo leer el historial.' }, 502);
  }
};
