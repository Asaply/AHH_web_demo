import { describe, expect, it } from 'vitest';
import { gitBlobSha, isJpeg, planSave } from './save';

const SHA = 'a'.repeat(40);
const property = {
  slug: 'casa-x', name: 'Casa X', kind: 'casa', status: 'disponible', location: 'Chihuahua', price: '$1 MXN', summary: 'S',
  landArea: 100, distribution: [], highlights: [], finishes: [], terms: [], photoDir: '/img/propiedades/casa-x', photos: ['01'],
};

describe('planSave', () => {
  it('404 para secciones desconocidas', () => {
    expect(planSave('usuarios', {})).toMatchObject({ ok: false, status: 404 });
  });

  it('400 si falta baseSha o el resumen', () => {
    expect(planSave('properties', { data: [property], summary: 'x' })).toMatchObject({ ok: false, status: 400 });
    expect(planSave('properties', { data: [property], baseSha: SHA })).toMatchObject({ ok: false, status: 400 });
  });

  it('400 si una foto apunta fuera de public/img/propiedades|proyectos', () => {
    for (const path of ['src/pages/index.astro', 'public/img/propiedades/../../x.jpg', 'public/img/hero-inicio.jpg']) {
      const body = { data: [property], baseSha: SHA, summary: 'x', photos: { remove: [path] } };
      expect(planSave('properties', body)).toMatchObject({ ok: false, status: 400 });
    }
  });

  it('422 con errores por campo', () => {
    const plan = planSave('properties', { data: [{ ...property, price: '' }], baseSha: SHA, summary: 'x' });
    expect(plan).toMatchObject({ ok: false, status: 422, fieldErrors: [{ path: '0.price', message: 'Este campo es obligatorio' }] });
  });

  it('arma los archivos del commit con el JSON normalizado', () => {
    const plan = planSave('properties', {
      data: [{ ...property, minPrice: 'interno' }],
      baseSha: SHA,
      summary: 'Casa X — precio',
      photos: {
        add: [{ path: 'public/img/propiedades/casa-x/n1.jpg', blobSha: 'b'.repeat(40) }],
        remove: ['public/img/propiedades/casa-x/01-sm.jpg'],
      },
    });
    if (!plan.ok) throw new Error('esperaba ok');
    expect(plan.message).toBe('Panel: Casa X — precio');
    expect(plan.path).toBe('src/content/properties.json');
    const [content, added, removed] = plan.files;
    expect(content).toMatchObject({ path: 'src/content/properties.json' });
    expect('content' in content && content.content.endsWith('\n')).toBe(true);
    expect('content' in content && content.content.includes('minPrice')).toBe(false);
    expect(added).toEqual({ path: 'public/img/propiedades/casa-x/n1.jpg', blobSha: 'b'.repeat(40) });
    expect(removed).toEqual({ path: 'public/img/propiedades/casa-x/01-sm.jpg', delete: true });
    expect(plan.newSha).toBe(gitBlobSha('content' in content ? content.content : ''));
  });
});

describe('gitBlobSha', () => {
  it('coincide con git hash-object', () => {
    expect(gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });
});

describe('isJpeg', () => {
  it('revisa la firma FF D8 FF', () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isJpeg(new Uint8Array([]))).toBe(false);
  });
});
