import { describe, expect, it } from 'vitest';
import { findUser, hashPassword, parseUsers, SESSION_TTL_MS, signSession, verifyPassword, verifySession } from './auth';

describe('contraseñas', () => {
  const stored = hashPassword('una-contraseña-larga');

  it('verifica la correcta y rechaza otra', () => {
    expect(verifyPassword('una-contraseña-larga', stored)).toBe(true);
    expect(verifyPassword('otra-contraseña', stored)).toBe(false);
  });

  it('no usa "$" (dotenv-expand lo trataría como variable)', () => {
    expect(stored).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
  });

  it('usa sal distinta en cada hash', () => {
    expect(hashPassword('x'.repeat(12))).not.toBe(hashPassword('x'.repeat(12)));
  });

  it('rechaza hashes mal formados sin lanzar', () => {
    expect(verifyPassword('a', 'texto')).toBe(false);
    expect(verifyPassword('a', 'scrypt:abc:8:1:c2FsdA:aGFzaA')).toBe(false);
  });
});

describe('sesión', () => {
  const secret = 's'.repeat(40);
  const now = 1_700_000_000_000;

  it('firma y verifica', () => {
    expect(verifySession(signSession('omar@ahh.mx', secret, now), secret, now + 1000)).toBe('omar@ahh.mx');
  });

  it('expira a los 7 días', () => {
    const token = signSession('omar@ahh.mx', secret, now);
    expect(verifySession(token, secret, now + SESSION_TTL_MS + 1)).toBeNull();
  });

  it('rechaza tokens alterados, con otro secreto o basura', () => {
    const token = signSession('omar@ahh.mx', secret, now);
    const [, sig] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ e: 'otro@x.mx', x: now + 1e9 })).toString('base64url')}.${sig}`;
    expect(verifySession(forged, secret, now)).toBeNull();
    expect(verifySession(token, 'otro'.repeat(10), now)).toBeNull();
    expect(verifySession('basura', secret, now)).toBeNull();
    expect(verifySession('', secret, now)).toBeNull();
  });
});

describe('usuarios', () => {
  const raw = JSON.stringify([{ email: 'Omar@AHH.mx', name: 'Omar', hash: hashPassword('contraseña-larga') }]);

  it('normaliza correos y los busca sin importar mayúsculas', () => {
    const users = parseUsers(raw);
    expect(users[0].email).toBe('omar@ahh.mx');
    expect(findUser(users, '  OMAR@ahh.mx ')?.name).toBe('Omar');
    expect(findUser(users, 'nadie@ahh.mx')).toBeUndefined();
  });

  it('lanza si la variable no es un arreglo válido', () => {
    expect(() => parseUsers('{}')).toThrow();
    expect(() => parseUsers('[{"email":"x"}]')).toThrow();
  });
});
