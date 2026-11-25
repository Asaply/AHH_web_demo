import { describe, expect, it } from 'vitest';
import { blankProperty, photoChanges } from './property';

describe('blankProperty', () => {
  it('copia las condiciones de venta de la plantilla', () => {
    const template = { ...blankProperty(), terms: [{ label: 'Crédito', value: 'Sí' }] };
    const p = blankProperty(template);
    expect(p.terms).toEqual([{ label: 'Crédito', value: 'Sí' }]);
    expect(p.terms).not.toBe(template.terms);
    expect(p.photos).toEqual([]);
  });
});

describe('photoChanges', () => {
  const p = { ...blankProperty(), photoDir: '/img/propiedades/casa-x', photos: ['01', 'nueva'] };

  it('agrega las nuevas listas y borra ambas versiones de las quitadas', () => {
    const changes = photoChanges(
      p,
      { nueva: { state: 'ready', fullSha: 'f'.repeat(40), smallSha: 's'.repeat(40), preview: 'blob:x' } },
      ['02'],
      new Set(),
    );
    expect(changes.add).toEqual([
      { path: 'public/img/propiedades/casa-x/nueva.jpg', blobSha: 'f'.repeat(40) },
      { path: 'public/img/propiedades/casa-x/nueva-sm.jpg', blobSha: 's'.repeat(40) },
    ]);
    expect(changes.remove).toEqual(['public/img/propiedades/casa-x/02.jpg', 'public/img/propiedades/casa-x/02-sm.jpg']);
  });

  it('no borra fotos que usa un proyecto ni las que se volvieron a agregar', () => {
    const changes = photoChanges(p, {}, ['02', '01'], new Set(['/img/propiedades/casa-x/02-sm.jpg']));
    expect(changes.remove).toEqual([]);
  });

  it('ignora pendientes que ya no están en la galería o siguen procesando', () => {
    const changes = photoChanges({ ...p, photos: ['01'] }, { nueva: { state: 'processing' } }, [], new Set());
    expect(changes.add).toEqual([]);
  });
});
