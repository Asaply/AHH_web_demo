import type { APIRoute } from 'astro';
import { github, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const sha = url.searchParams.get('sha') ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) return json({ error: 'Commit inválido.' }, 400);
  try {
    return json({ state: await github().deployState(sha) });
  } catch (error) {
    console.error('[admin] estado falló', error);
    return json({ error: 'No se pudo consultar la publicación.' }, 502);
  }
};
