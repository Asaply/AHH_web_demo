import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth';
import { json } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
  return json({ ok: true });
};
