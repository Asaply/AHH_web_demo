import { describe, expect, it } from 'vitest';
import { changedLabels, digitsToPhone, errorFor, move, newPhotoName, phoneToDigits, slugify, summarize, timeAgo } from './format';

describe('slugify', () => {
  it('quita acentos, espacios y símbolos', () => {
    expect(slugify('Casa en Los Leones IV — Ñandú')).toBe('casa-en-los-leones-iv-nandu');
    expect(slugify('  ')).toBe('');
  });
});

describe('teléfono', () => {
  it('normaliza a 52 + 10 dígitos', () => {
    expect(phoneToDigits('(614) 577-1685')).toBe('526145771685');
    expect(phoneToDigits('+52 614 577 1685')).toBe('526145771685');
    expect(phoneToDigits('')).toBe('');
    expect(phoneToDigits('614 57')).toBe('61457');
  });

  it('formatea para mostrar', () => {
    expect(digitsToPhone('526145771685')).toBe('614 577 1685');
    expect(digitsToPhone('')).toBe('');
  });
});

describe('newPhotoName', () => {
  it('genera nombres válidos para el schema', () => {
    expect(newPhotoName(1_700_000_000_000, () => 0.5)).toMatch(/^[a-z0-9]{12}$/);
  });
});

describe('errorFor', () => {
  it('busca por ruta exacta', () => {
    const errors = [{ path: '0.price', message: 'x' }];
    expect(errorFor(errors, '0.price')).toBe('x');
    expect(errorFor(errors, '0.name')).toBeUndefined();
  });
});

describe('move', () => {
  it('mueve sin mutar e ignora límites', () => {
    const list = ['a', 'b', 'c'];
    expect(move(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(move(list, 0, -1)).toBe(list);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('resúmenes', () => {
  it('lista solo los campos que cambiaron', () => {
    expect(changedLabels({ price: '1', name: 'A' }, { price: '2', name: 'A' }, { price: 'precio', name: 'nombre' })).toEqual(['precio']);
  });

  it('arma un resumen de máximo 120 caracteres', () => {
    expect(summarize('Casa X', ['precio', 'estatus'])).toBe('Casa X — precio, estatus');
    expect(summarize('Casa X', [])).toBe('Casa X');
    expect(summarize('x'.repeat(200), []).length).toBe(120);
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  it('habla en minutos, horas o fecha', () => {
    expect(timeAgo('2026-11-24T11:59:40Z', now)).toBe('hace un momento');
    expect(timeAgo('2026-11-24T11:45:00Z', now)).toBe('hace 15 min');
    expect(timeAgo('2026-11-24T09:00:00Z', now)).toBe('hace 3 h');
    expect(timeAgo('2026-11-20T09:00:00Z', now)).toMatch(/20/);
  });
});
