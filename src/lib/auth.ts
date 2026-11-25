import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'astro/zod';

/* Solo sintaxis TS borrable: scripts/admin-user.ts importa este archivo con
   `node` directo. */

export type AdminUser = { email: string; name: string; hash: string };

export const SESSION_COOKIE = 'ahh_admin';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LENGTH, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  try {
    const expected = Buffer.from(key, 'base64url');
    const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const usersSchema = z.array(
  z.object({ email: z.email(), name: z.string().min(1), hash: z.string().startsWith('scrypt$') }),
);

export function parseUsers(raw: string): AdminUser[] {
  return usersSchema.parse(JSON.parse(raw)).map(u => ({ ...u, email: u.email.toLowerCase() }));
}

export function findUser(users: AdminUser[], email: string): AdminUser | undefined {
  const wanted = email.trim().toLowerCase();
  return users.find(u => u.email === wanted);
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function signSession(email: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: email, x: now + SESSION_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(token: string, secret: string, now = Date.now()): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof e === 'string' && typeof x === 'number' && x > now ? e : null;
  } catch {
    return null;
  }
}
