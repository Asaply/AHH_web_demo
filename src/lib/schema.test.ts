import { describe, expect, it } from 'vitest';
import { photoUrl, projectsSchema, propertiesSchema, servicesSchema, settingsSchema } from './schema';

const property = (overrides: Record<string, unknown> = {}) => ({
  slug: 'casa-prueba',
  name: 'Casa de prueba',
  kind: 'casa',
  status: 'disponible',
  location: 'Chihuahua',
  price: '$1,000,000 MXN',
  summary: 'Una casa.',
  landArea: 120,
  distribution: [{ floor: 'Planta baja', rooms: ['Sala'] }],
  highlights: ['Ladrillo rojo'],
  finishes: [{ label: 'Pisos', value: 'Porcelanato' }],
  terms: [{ label: 'Crédito', value: 'Sí' }],
  photoDir: '/img/propiedades/casa-prueba',
  photos: ['01', 'm3k9x2ab'],
  ...overrides,
});

describe('propertiesSchema', () => {
  it('acepta una propiedad válida', () => {
    expect(propertiesSchema.parse([property()])).toHaveLength(1);
  });

  it('rechaza slugs con mayúsculas o espacios', () => {
    const result = propertiesSchema.safeParse([property({ slug: 'Casa Prueba' })]);
    expect(result.success).toBe(false);
  });

  it('pide el terreno con un mensaje en español', () => {
    const result = propertiesSchema.safeParse([property({ landArea: undefined })]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: [0, 'landArea'], message: 'Este campo es obligatorio' });
  });

  it('solo acepta baños enteros o medios', () => {
    expect(propertiesSchema.safeParse([property({ baths: 2.5 })]).success).toBe(true);
    expect(propertiesSchema.safeParse([property({ baths: 2.3 })]).success).toBe(false);
  });

  it('marca slugs repetidos en la segunda propiedad', () => {
    const result = propertiesSchema.safeParse([property(), property()]);
    expect(result.error?.issues[0]).toMatchObject({ path: [1, 'slug'], message: 'Ya existe otra propiedad con esta URL' });
  });

  it('rechaza nombres de foto con rutas', () => {
    expect(propertiesSchema.safeParse([property({ photos: ['../x'] })]).success).toBe(false);
  });

  it('descarta claves desconocidas (p. ej. campos internos)', () => {
    const [parsed] = propertiesSchema.parse([property({ minPrice: '900000' })]);
    expect(parsed).not.toHaveProperty('minPrice');
  });
});

describe('projectsSchema', () => {
  const project = { slug: 'los-leones-1', name: 'Residencia', category: 'residencial', location: 'Chihuahua', image: '/img/proyectos/los-leones/01-sm.jpg' };

  it('acepta foto vacía o una ruta -sm.jpg', () => {
    expect(projectsSchema.safeParse([project]).success).toBe(true);
    expect(projectsSchema.safeParse([{ ...project, image: '' }]).success).toBe(true);
    expect(projectsSchema.safeParse([{ ...project, image: '/img/otro/x.jpg' }]).success).toBe(false);
  });
});

describe('settingsSchema', () => {
  const settings = {
    brand: { name: 'AHH', slogan: 'Construimos', yearsOfExperience: 10 },
    contact: { phoneDigits: '', visitsWhatsapp: '526145771685', street: 'Calle 33', colonia: 'Altavista', city: 'Chihuahua', coverage: 'Todo el estado', hours: '24 h' },
  };

  it('permite teléfono vacío pero no incompleto', () => {
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    const bad = { ...settings, contact: { ...settings.contact, phoneDigits: '52614' } };
    expect(settingsSchema.safeParse(bad).success).toBe(false);
  });
});

describe('servicesSchema', () => {
  it('exige exactamente cuatro servicios', () => {
    const service = { num: '01', slug: 'construccion', title: 'Construcción', summary: 'a', short: 'b', points: ['c'], image: '/img/x.jpg', icon: 'home' };
    expect(servicesSchema.safeParse([service]).success).toBe(false);
    expect(servicesSchema.safeParse([service, service, service, service]).success).toBe(true);
  });
});

describe('photoUrl', () => {
  it('arma la ruta grande y la -sm', () => {
    expect(photoUrl('/img/propiedades/x', '01')).toBe('/img/propiedades/x/01.jpg');
    expect(photoUrl('/img/propiedades/x', '01', true)).toBe('/img/propiedades/x/01-sm.jpg');
  });
});
