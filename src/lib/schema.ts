import { z } from 'astro/zod';

/* Schemas del contenido editable. Los usa el sitio (site.ts, al compilar) y la
   API del panel (antes de cada commit): un dato inválido nunca llega a main. */

z.config(z.locales.es());

const REQUIRED = 'Este campo es obligatorio';

const text = z.string({ error: REQUIRED }).trim().min(1, REQUIRED);
const optionalText = z.string().trim().optional();
const slug = z.string({ error: REQUIRED }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones');
const photoName = z.string().regex(/^[a-z0-9-]+$/, 'Nombre de foto inválido');
const pair = z.object({ label: text, value: text });

const uniqueSlugs = (message: string) => (list: { slug: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  list.forEach((item, index) => {
    if (seen.has(item.slug)) ctx.addIssue({ code: 'custom', path: [index, 'slug'], message });
    seen.add(item.slug);
  });
};

export const propertySchema = z.object({
  slug,
  name: text,
  kind: z.enum(['casa', 'terreno']),
  status: z.enum(['disponible', 'apartado', 'vendido']),
  location: text,
  /* Solo se publica la dirección cuando la ficha la trae y la propiedad sigue
     a la venta; la de una casa vendida ya es de otra familia. */
  address: optionalText,
  mapUrl: z.url('Debe ser una liga completa (https://…)').optional(),
  price: text,
  summary: text,
  landArea: z.number({ error: REQUIRED }).positive('Debe ser mayor que 0'),
  builtArea: z.number().positive('Debe ser mayor que 0').optional(),
  beds: z.number().int('Usa un número entero').min(0).optional(),
  baths: z.number().min(0).multipleOf(0.5, 'Usa enteros o medios (2.5)').optional(),
  floors: z.number().int('Usa un número entero').min(1).optional(),
  parking: z.number().int('Usa un número entero').min(0).optional(),
  /* Medidas tal como vienen en la ficha: algunos terrenos son irregulares. */
  frontage: optionalText,
  depth: optionalText,
  distribution: z.array(z.object({ floor: text, rooms: z.array(text) })),
  highlights: z.array(text),
  finishes: z.array(pair),
  terms: z.array(pair),
  photoDir: z.string().regex(/^\/img\/propiedades\/[a-z0-9-]+$/, 'Carpeta de fotos inválida'),
  /* Nombres base dentro de photoDir; el orden es el de la galería y el primero
     es la portada. */
  photos: z.array(photoName),
  hidden: z.boolean().optional(),
});

export const propertiesSchema = z.array(propertySchema).superRefine(uniqueSlugs('Ya existe otra propiedad con esta URL'));

export const projectSchema = z.object({
  slug,
  name: text,
  category: z.enum(['residencial', 'comercial', 'remodelacion']),
  location: text,
  image: z.string().regex(/^(\/img\/(propiedades|proyectos)\/[a-z0-9-]+\/[a-z0-9-]+-sm\.jpg)?$/, 'Foto inválida'),
  /* Slug de la propiedad a la venta que corresponde a esta obra. */
  property: slug.optional(),
});

export const projectsSchema = z.array(projectSchema).superRefine(uniqueSlugs('Ya existe otro proyecto con este nombre'));

export const settingsSchema = z.object({
  brand: z.object({
    name: text,
    slogan: text,
    yearsOfExperience: z.number({ error: REQUIRED }).int('Usa un número entero').min(0),
  }),
  contact: z.object({
    /* 52 + 10 dígitos, o vacío mientras el cliente no entregue número: los CTA
       de teléfono y WhatsApp se ocultan solos. */
    phoneDigits: z.string().regex(/^(52\d{10})?$/, 'Escribe los 10 dígitos del teléfono'),
    visitsWhatsapp: z.string().regex(/^52\d{10}$/, 'Escribe los 10 dígitos del WhatsApp'),
    street: text,
    colonia: text,
    city: text,
    coverage: text,
    hours: text,
  }),
});

export const serviceSchema = z.object({
  num: z.string(),
  slug,
  title: text,
  summary: text,
  short: text,
  points: z.array(text).min(1, 'Agrega al menos un punto'),
  image: z.string(),
  icon: z.enum(['home', 'brush', 'blueprint', 'helmet']),
});

export const servicesSchema = z.array(serviceSchema).length(4);

export type Property = z.infer<typeof propertySchema>;
export type PropertyStatus = Property['status'];
export type Project = z.infer<typeof projectSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Service = z.infer<typeof serviceSchema>;

export const statusLabel: Record<PropertyStatus, string> = {
  disponible: 'En venta',
  apartado: 'Apartada',
  vendido: 'Vendida',
};

export const categoryLabels: Record<Project['category'], string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  remodelacion: 'Remodelación',
};

export const photoUrl = (dir: string, name: string, small = false) => `${dir}/${name}${small ? '-sm' : ''}.jpg`;
