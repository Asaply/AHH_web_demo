import { photoUrl } from '../lib/content-utils';
import type { Property } from '../lib/schema';

export type PendingPhoto = { state: 'processing' } | { state: 'ready'; fullSha: string; smallSha: string; preview: string };

export const PROPERTY_LABELS: Record<string, string> = {
  name: 'nombre', status: 'estatus', price: 'precio', kind: 'tipo', location: 'ubicación', address: 'dirección',
  mapUrl: 'mapa', summary: 'descripción', landArea: 'terreno', builtArea: 'construcción', beds: 'recámaras',
  baths: 'baños', floors: 'plantas', parking: 'cochera', frontage: 'frente', depth: 'fondo',
  distribution: 'distribución', highlights: 'diferenciadores', finishes: 'acabados', terms: 'condiciones',
  hidden: 'visibilidad',
};

export function blankProperty(template?: Property): Property {
  return {
    slug: '',
    name: '',
    kind: 'casa',
    status: 'disponible',
    location: '',
    price: '',
    summary: '',
    landArea: undefined as unknown as number,
    distribution: [],
    highlights: [],
    finishes: [],
    terms: template ? template.terms.map(t => ({ ...t })) : [],
    photoDir: '',
    photos: [],
  };
}

/* Traduce el estado de la galería a archivos del commit. Las fotos que un
   proyecto usa como portada no se borran aunque salgan de la galería. */
export function photoChanges(p: Property, pending: Record<string, PendingPhoto>, removed: string[], protectedUrls: Set<string>) {
  const add = p.photos.flatMap(name => {
    const item = pending[name];
    if (!item || item.state !== 'ready') return [];
    return [
      { path: `public${photoUrl(p.photoDir, name)}`, blobSha: item.fullSha },
      { path: `public${photoUrl(p.photoDir, name, true)}`, blobSha: item.smallSha },
    ];
  });
  const remove = removed
    .filter(name => !p.photos.includes(name) && !pending[name] && !protectedUrls.has(photoUrl(p.photoDir, name, true)))
    .flatMap(name => [`public${photoUrl(p.photoDir, name)}`, `public${photoUrl(p.photoDir, name, true)}`]);
  return { add, remove };
}
