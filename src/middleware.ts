import { defineMiddleware } from 'astro:middleware';
import { findUser, SESSION_COOKIE, verifySession } from './lib/auth';
import { getServerEnv } from './lib/env';
import { isSameOrigin } from './lib/origin';
import { json } from './lib/server';

const PUBLIC_PATHS = new Set(['/admin/login', '/admin/api/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/+$/, '') || '/';
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  if (context.isPrerendered || !isAdmin) return next();

  const isApi = path.startsWith('/admin/api/');
  if (context.request.method !== 'GET' && !isSameOrigin(context.request)) {
    return json({ error: 'Origen no permitido.' }, 403);
  }

  if (!PUBLIC_PATHS.has(path)) {
    const env = getServerEnv();
    const email = verifySession(context.cookies.get(SESSION_COOKIE)?.value ?? '', env.sessionSecret);
    // Quitar a alguien de ADMIN_USERS le quita el acceso aunque su cookie siga viva.
    const user = email ? findUser(env.users, email) : undefined;
    if (!user) {
      context.cookies.delete(SESSION_COOKIE, { path: '/admin' });
      return isApi
        ? json({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)
        : context.redirect(`/admin/login?next=${encodeURIComponent(path)}`);
    }
    context.locals.user = { email: user.email, name: user.name };
  }

  const response = await next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
