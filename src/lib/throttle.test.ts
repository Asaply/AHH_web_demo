import { describe, expect, it } from 'vitest';
import { createThrottle } from './throttle';

describe('createThrottle', () => {
  it('bloquea al quinto fallo dentro de la ventana y libera después', () => {
    const t = createThrottle(5, 1000);
    for (let i = 0; i < 4; i++) t.fail('k', i);
    expect(t.isBlocked('k', 10)).toBe(false);
    t.fail('k', 10);
    expect(t.isBlocked('k', 11)).toBe(true);
    expect(t.isBlocked('k', 1011)).toBe(false);
  });

  it('separa por clave y se limpia con reset', () => {
    const t = createThrottle(1, 1000);
    t.fail('a', 0);
    expect(t.isBlocked('a', 1)).toBe(true);
    expect(t.isBlocked('b', 1)).toBe(false);
    t.reset('a');
    expect(t.isBlocked('a', 2)).toBe(false);
  });
});
