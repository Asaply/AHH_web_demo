import type { APIRoute } from 'astro';
import { findUser, hashPassword, SESSION_COOKIE, SESSION_TTL_MS, signSession, verifyPassword } from '../../../lib/auth';
import { getServerEnv } from '../../../lib/env';
import { json } from '../../../lib/server';
import { loginThrottle } from '../../../lib/throttle';

export const prerender = false;

// Con un correo inexistente se verifica igual contra este hash, para que el
// tiempo de respuesta no revele qué correos existen.
let dummyHash: string | undefined;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  let ip = 'desconocida';
  try {
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress;
  } catch {
    /* algunos entornos no exponen la IP */
  }
  const key = `${email}|${ip}`;
  if (loginThrottle.isBlocked(key)) {
    return json({ error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' }, 429);
  }

  const env = getServerEnv();
  const user = findUser(env.users, email);
  dummyHash ??= hashPassword('contraseña-de-relleno');
  const valid = verifyPassword(password, user?.hash ?? dummyHash) && Boolean(user);

  if (!user || !valid) {
    loginThrottle.fail(key);
    await new Promise(resolve => setTimeout(resolve, 400));
    return json({ error: 'Correo o contraseña incorrectos.' }, 401);
  }

  loginThrottle.reset(key);
  cookies.set(SESSION_COOKIE, signSession(user.email, env.sessionSecret), {
    path: '/admin',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return json({ ok: true });
};
