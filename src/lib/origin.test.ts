import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './origin';

const req = (headers: Record<string, string>) => new Request('https://ahh.vercel.app/admin/api/x', { method: 'POST', headers });

describe('isSameOrigin', () => {
  it('acepta el mismo host', () => {
    expect(isSameOrigin(req({ origin: 'https://ahh.vercel.app', host: 'ahh.vercel.app' }))).toBe(true);
  });

  it('usa x-forwarded-host cuando existe', () => {
    expect(isSameOrigin(req({ origin: 'https://ahh.mx', host: 'interno', 'x-forwarded-host': 'ahh.mx' }))).toBe(true);
  });

  it('rechaza otro origen, origen ausente o malformado', () => {
    expect(isSameOrigin(req({ origin: 'https://malo.com', host: 'ahh.vercel.app' }))).toBe(false);
    expect(isSameOrigin(req({ host: 'ahh.vercel.app' }))).toBe(false);
    expect(isSameOrigin(req({ origin: 'nada', host: 'ahh.vercel.app' }))).toBe(false);
  });
});
