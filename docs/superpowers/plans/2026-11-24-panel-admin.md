# Panel de administrador — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel `/admin` en español para que AHH edite propiedades (con fotos), proyectos, contacto y servicios; cada guardado es un commit en GitHub que Vercel publica solo.

**Architecture:** Astro sigue prerenderizando el sitio público desde JSON en `src/content/`. Las rutas `/admin/*` corren en Vercel (`@astrojs/vercel`, `prerender = false`), protegidas por una cookie firmada, y leen y escriben esos JSON con la API de GitHub (Git Data API: un commit atómico por guardado). Los formularios son islas Preact; las fotos se redimensionan en el navegador.

**Tech Stack:** Astro 7.2, @astrojs/vercel 11, @astrojs/preact 6 + preact 10, zod 4 (`astro/zod`), Tailwind 4, vitest 5, puppeteer-core (E2E con el Chrome instalado), `node:crypto`.

**Spec:** `docs/superpowers/specs/2026-11-24-panel-admin-design.md`

## Global Constraints

- Node ≥ 22.12 (`engines`). Los scripts `.ts` corren con `node` directo (Node 24, type stripping).
- Las páginas públicas siguen prerenderizadas. Solo los archivos en `src/pages/admin/**` exportan `export const prerender = false`.
- El sitio público no carga JS nuevo: Preact solo se usa en islas dentro de `/admin`.
- Todo texto visible del panel va en español. Identificadores en inglés; comentarios en español (patrón actual del repo).
- Nada de campos USO INTERNO (precio mínimo, gravamen, observaciones) en schemas, formularios ni JSON: el repo es público.
- El autor de los commits del panel es `{ name: <nombre del usuario>, email: 'panel@ahh-construccion.invalid' }` (el correo real del cliente no se publica).
- Rutas de fotos en el repo: `public/img/(propiedades|proyectos)/<carpeta>/<nombre>.jpg` y `<nombre>-sm.jpg`, con `<nombre>` en `[a-z0-9-]+`. Tamaños: 1800 px lado largo (calidad 0.82) y 720 px (calidad 0.78).
- Mensajes de commit del panel: `Panel: <resumen>`, máximo 120 caracteres de resumen.
- Commits del desarrollo: Conventional Commits y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Trabajo en la rama `feat/admin-panel`. Durante el desarrollo, el panel escribe en la rama `admin-sandbox` (`GITHUB_BRANCH=admin-sandbox`), nunca en `main`.
- Desviaciones del spec: `socials` no se renderiza en ningún componente, así que queda en `site.ts` y el panel no lo edita. El correo del autor de los commits es el placeholder de arriba.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/schema.ts` | Schemas zod compartidos, tipos, `photoUrl`, `statusLabel`, `categoryLabels` |
| `src/content/*.json` | Contenido editable (fuente de verdad) |
| `src/data/site.ts` | Importa y valida los JSON; exporta lo mismo que hoy a las páginas |
| `src/lib/auth.ts` | Hash scrypt, sesión firmada, usuarios |
| `src/lib/throttle.ts` | Límite de intentos de login en memoria |
| `src/lib/origin.ts` | Chequeo de `Origin` (CSRF) |
| `src/lib/github.ts` | Cliente de la API de GitHub (leer, blob, commit atómico, historial, deploy) |
| `src/lib/content-files.ts` | Registro nombre → ruta + schema |
| `src/lib/save.ts` | `planSave` (valida la petición y arma el commit), `gitBlobSha`, `isJpeg` |
| `src/lib/env.ts` | Lee `astro:env/server` y valida variables |
| `src/lib/server.ts` | `json()`, `github()`, `rawBaseUrl()` para rutas del panel |
| `src/middleware.ts` | Sesión y CSRF para `/admin/*` |
| `src/layouts/AdminLayout.astro` | Layout del panel (navegación, salir) |
| `src/pages/admin/**` | Páginas y API del panel |
| `src/admin/format.ts` | Helpers puros del cliente (slug, teléfono, mover, resúmenes, fechas) |
| `src/admin/api.ts`, `draft.ts`, `image.ts`, `useEditor.ts`, `ui.ts` | Base del cliente |
| `src/admin/components/*.tsx` | Campos, listas, SaveBar, galería y editores |
| `scripts/admin-user.ts` | Genera la entrada de `ADMIN_USERS` |
| `tests/e2e/admin.e2e.mjs` | E2E con puppeteer-core contra el dev server |

---

### Task 1: Vitest y schemas compartidos

**Files:**
- Create: `vitest.config.ts`, `src/lib/schema.ts`, `src/lib/schema.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `test`)

**Interfaces:**
- Produces: `propertySchema`, `propertiesSchema`, `projectSchema`, `projectsSchema`, `settingsSchema`, `serviceSchema`, `servicesSchema`; tipos `Property`, `PropertyStatus`, `Project`, `Settings`, `Service`; `photoUrl(dir: string, name: string, small?: boolean): string`; `statusLabel: Record<PropertyStatus, string>`; `categoryLabels: Record<Project['category'], string>`.

- [ ] **Step 1: Instalar vitest y configurar**

```bash
npm i -D vitest@^5.1.1
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

En `package.json`, dentro de `scripts`, agregar `"test": "vitest run"`.

- [ ] **Step 2: Escribir el test que falla**

`src/lib/schema.test.ts`:

```ts
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
```

- [ ] **Step 3: Correr y ver que falla**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL, `Cannot find module './schema'`.

- [ ] **Step 4: Implementar `src/lib/schema.ts`**

```ts
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
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS (11 tests). Si `z.locales.es` o `{ error }` no existen en esta versión de zod, revisar `node_modules/zod/package.json` (debe ser 4.x) antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat(admin): shared zod schemas for editable content"
```

---

### Task 2: Migrar los datos de `site.ts` a JSON sin cambios visibles

**Files:**
- Create: `src/content/properties.json`, `src/content/projects.json`, `src/content/settings.json`, `src/content/services.json`, `src/content/content.test.ts`
- Modify: `src/data/site.ts` (todo lo que va de `brand` a `projects`, más los tipos), `src/pages/propiedades/[slug].astro:15-18`
- Temporal (no se commitea): `scripts/export-content.ts`

**Interfaces:**
- Consumes: schemas, `photoUrl`, `statusLabel`, `categoryLabels` (Task 1).
- Produces: `site.ts` mantiene sus exports (`brand`, `contact`, `socials`, `services`, `catalog`, `properties`, `photo`, `statusLabel`, `visitsWhatsapp`, `projects`, `values`, `process`, `features`) y tipos (`Property`, `PropertyStatus`, `Service`, `Project`). `properties` ya filtra las `hidden`. `Project` agrega `categoryLabel: string` y `href?: string` calculados.

- [ ] **Step 1: Compilar el estado actual como referencia**

```bash
npx astro build && rm -rf /tmp/ahh-dist-before && cp -R dist /tmp/ahh-dist-before
```

(Usar la carpeta scratchpad de la sesión en lugar de `/tmp` si está disponible.)

- [ ] **Step 2: Script temporal de exportación**

`scripts/export-content.ts`:

```ts
import { writeFileSync } from 'node:fs';
import * as site from '../src/data/site.ts';

const write = (name: string, data: unknown) =>
  writeFileSync(new URL(`../src/content/${name}.json`, import.meta.url), `${JSON.stringify(data, null, 2)}\n`);

write('properties', site.properties.map(({ photoCount, photoDir, ...p }) => ({
  ...p,
  photoDir: photoDir ?? `/img/propiedades/${p.slug}`,
  photos: Array.from({ length: photoCount }, (_, i) => String(i + 1).padStart(2, '0')),
})));

write('projects', site.projects.map(({ categoryLabel, href, ...p }) => ({
  ...p,
  ...(href ? { property: href.replace('/propiedades/', '') } : {}),
})));

write('settings', {
  brand: site.brand,
  contact: {
    phoneDigits: '',
    visitsWhatsapp: site.visitsWhatsapp,
    street: site.contact.street,
    colonia: site.contact.colonia,
    city: site.contact.city,
    coverage: site.contact.coverage,
    hours: site.contact.hours,
  },
});

write('services', site.services);
```

```bash
mkdir -p src/content && node scripts/export-content.ts && rm scripts/export-content.ts && ls src/content
```

Expected: `projects.json properties.json services.json settings.json`. Revisar que `properties.json` tenga `"photos": ["01", …]` (10, 23, 0 y 19 elementos) y que `projects.json` tenga `"property": "casa-alleza-boreal"` en el tercero.

- [ ] **Step 3: Test de que los JSON reales son válidos**

`src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import properties from './properties.json';
import projects from './projects.json';
import settings from './settings.json';
import services from './services.json';
import { projectsSchema, propertiesSchema, servicesSchema, settingsSchema } from '../lib/schema';

describe('contenido del repo', () => {
  it('pasa los schemas', () => {
    expect(() => propertiesSchema.parse(properties)).not.toThrow();
    expect(() => projectsSchema.parse(projects)).not.toThrow();
    expect(() => settingsSchema.parse(settings)).not.toThrow();
    expect(() => servicesSchema.parse(services)).not.toThrow();
  });

  it('las fotos listadas existen en public/', async () => {
    const { existsSync } = await import('node:fs');
    for (const p of propertiesSchema.parse(properties)) {
      for (const name of p.photos) {
        expect(existsSync(`public${p.photoDir}/${name}.jpg`), `${p.slug}/${name}`).toBe(true);
        expect(existsSync(`public${p.photoDir}/${name}-sm.jpg`), `${p.slug}/${name}-sm`).toBe(true);
      }
    }
  });
});
```

En `vitest.config.ts`, cambiar `include` a `['src/**/*.test.ts']` (ya lo cubre). Run: `npx vitest run src/content/content.test.ts` → PASS.

- [ ] **Step 4: Reescribir la parte de datos de `src/data/site.ts`**

Reemplazar desde `export const brand = {` hasta el final del bloque `export const projects: Project[] = [...]` (se conserva `catalog` tal cual, y `values`, `process` y `features` siguen abajo sin cambios) por:

```ts
import propertiesJson from '../content/properties.json';
import projectsJson from '../content/projects.json';
import settingsJson from '../content/settings.json';
import servicesJson from '../content/services.json';
import {
  categoryLabels,
  photoUrl,
  projectsSchema,
  propertiesSchema,
  servicesSchema,
  settingsSchema,
  statusLabel,
  type Project as ProjectData,
  type Property,
} from '../lib/schema';

export type { Property, PropertyStatus, Service } from '../lib/schema';
export { statusLabel };

/* El contenido editable vive en src/content/*.json y lo mantiene el panel
   /admin. Se valida aquí, al compilar: un JSON inválido rompe el build y
   Vercel sigue sirviendo la versión anterior. */
const settings = settingsSchema.parse(settingsJson);

export const brand = settings.brand;

/* Vacío mientras el cliente no entregue número: los CTA de WhatsApp y teléfono
   se ocultan solos. */
const phoneDigits = settings.contact.phoneDigits;

export const contact = {
  phone: phoneDigits ? phoneDigits.replace(/^52(\d{3})(\d{3})(\d{4})$/, '($1) $2 $3') : '',
  phoneHref: phoneDigits ? `tel:+${phoneDigits}` : '',
  whatsapp: phoneDigits ? `https://wa.me/${phoneDigits}` : '',
  hasPhone: Boolean(phoneDigits),
  street: settings.contact.street,
  colonia: settings.contact.colonia,
  city: settings.contact.city,
  coverage: settings.contact.coverage,
  hours: settings.contact.hours,
};

/* El cuestionario de marca pide no publicar correo y aún no existe Instagram.
   Ningún componente lo pinta todavía, por eso no está en el panel. */
export const socials: { label: string; icon: string; href: string }[] = [];

export const services = servicesSchema.parse(servicesJson);
```

(aquí sigue `export const catalog = [...]` sin cambios), y después:

```ts
/* Datos de las fichas comerciales del cliente. Las ocultas desde el panel no
   generan página ni tarjeta. */
export const properties: Property[] = propertiesSchema.parse(propertiesJson).filter(p => !p.hidden);

export const photo = (p: Property, i = 1, small = false) => {
  const name = p.photos[i - 1];
  return name ? photoUrl(p.photoDir, name, small) : '';
};

/* El teléfono que la ficha da para agendar visitas. El número general del
   sitio (contact.phone) sigue pendiente; este es el de quien enseña las casas. */
export const visitsWhatsapp = settings.contact.visitsWhatsapp;

export type Project = ProjectData & { categoryLabel: string; href?: string };

/* La liga "En venta" solo aparece si la propiedad sigue publicada. */
export const projects: Project[] = projectsSchema.parse(projectsJson).map(p => ({
  ...p,
  categoryLabel: categoryLabels[p.category],
  href: p.property && properties.some(x => x.slug === p.property) ? `/propiedades/${p.property}` : undefined,
}));
```

Borrar de `site.ts` las definiciones viejas que quedan duplicadas: `type Service`, `type PropertyStatus`, `type Property`, `brickHighlights`, `houseTerms`, `statusLabel` y `type Project`.

- [ ] **Step 5: Ajustar la galería de la ficha**

En `src/pages/propiedades/[slug].astro`, reemplazar:

```ts
const photos = Array.from({ length: p.photoCount }, (_, i) => ({
  full: photo(p, i + 1),
  small: photo(p, i + 1, true),
}));
```

por:

```ts
const photos = p.photos.map((_, i) => ({
  full: photo(p, i + 1),
  small: photo(p, i + 1, true),
}));
```

Run: `grep -rn "photoCount\|categoryLabel:" src` → solo debe aparecer `categoryLabel` dentro de `site.ts`.

- [ ] **Step 6: Compilar y comparar el HTML**

```bash
npx astro check 2>&1 | tail -5
npx astro build && diff -r /tmp/ahh-dist-before dist && echo IDENTICO
```

Expected: `astro check` sin errores y `IDENTICO`. Si `diff` solo reporta nombres de assets con hash distinto, comparar los `.html` con `diff <(sed 's/_astro\/[^"]*//g' a) <(sed ... b)`. Cualquier diferencia en texto o atributos es un bug de la migración y hay que corregirla antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add src/content src/data/site.ts src/pages/propiedades/[slug].astro
git commit -m "refactor: move editable site content to validated JSON"
```

---

### Task 3: Vercel como único hosting, Preact y variables de entorno

**Files:**
- Modify: `astro.config.mjs`, `tsconfig.json`, `package.json`, `.gitignore`
- Create: `.env.example`, `src/lib/env.ts`, `src/env.d.ts`
- Delete: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: `getServerEnv(): ServerEnv` con `{ users: AdminUser[]; sessionSecret: string; github: { token: string; repo: string; branch: string } }`; `App.Locals.user?: { email: string; name: string }`.
- Consumes: `parseUsers` y `AdminUser` de `src/lib/auth.ts` (Task 4). Hasta que exista, `env.ts` se crea en el Step 4 de la Task 4. Aquí solo se configura el entorno.

- [ ] **Step 1: Instalar**

```bash
npm i @astrojs/vercel@^11 @astrojs/preact@^6 preact@^10
```

- [ ] **Step 2: `astro.config.mjs`**

```js
// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import preact from '@astrojs/preact';

// El sitio público sigue prerenderizado; solo /admin corre en funciones de
// Vercel (cada página del panel declara `prerender = false`).
const secret = (options = {}) => envField.string({ context: 'server', access: 'secret', ...options });

export default defineConfig({
  adapter: vercel(),
  integrations: [preact()],
  env: {
    schema: {
      ADMIN_USERS: secret({ optional: true }),
      SESSION_SECRET: secret({ optional: true }),
      GITHUB_TOKEN: secret({ optional: true }),
      GITHUB_REPO: secret({ default: 'Asaply/AHH_web_demo' }),
      GITHUB_BRANCH: secret({ default: 'main' }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: TypeScript y JSX de Preact**

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", ".vercel"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

`src/env.d.ts`:

```ts
declare namespace App {
  interface Locals {
    user?: { email: string; name: string };
  }
}
```

- [ ] **Step 4: `.env.example` y `.gitignore`**

`.env.example`:

```bash
# Panel /admin. En Vercel van en Settings → Environment Variables
# (Production y Preview). Localmente: copia este archivo a .env.

# Arreglo JSON de usuarios. Cada entrada se genera con:
#   npm run admin:user -- correo@ejemplo.com "Nombre Apellido"
ADMIN_USERS='[]'

# 32+ bytes aleatorios. Cambiarlo cierra todas las sesiones.
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
SESSION_SECRET=

# Token fine-grained: solo este repo; Contents read/write, Deployments read.
GITHUB_TOKEN=
GITHUB_REPO=Asaply/AHH_web_demo
# En desarrollo y en Preview: admin-sandbox. En Production: main.
GITHUB_BRANCH=admin-sandbox
```

En `.gitignore`, agregar `.vercel/` debajo de `dist/`.

- [ ] **Step 5: Retirar GitHub Pages del código**

```bash
git rm .github/workflows/deploy.yml
```

(Desactivar Pages en la configuración del repo es un paso del dueño; ver Task 14.)

- [ ] **Step 6: Verificar que el build sigue prerenderizando todo**

```bash
npx astro build 2>&1 | tail -5 && ls .vercel/output/static/index.html .vercel/output/static/propiedades/casa-alleza-boreal/index.html
```

Expected: build OK y ambos archivos existen. Run: `npx vitest run` → PASS.

- [ ] **Step 7: Commit**

```bash
git add astro.config.mjs tsconfig.json package.json package-lock.json .gitignore .env.example src/env.d.ts
git commit -m "build: deploy on Vercel only, add Preact and server env schema"
```

---

### Task 4: Autenticación (hash, sesión, usuarios, límite de intentos)

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth.test.ts`, `src/lib/throttle.ts`, `src/lib/throttle.test.ts`, `src/lib/env.ts`, `scripts/admin-user.ts`
- Modify: `package.json` (script `admin:user`)

**Interfaces:**
- Produces:
  - `type AdminUser = { email: string; name: string; hash: string }`
  - `SESSION_COOKIE = 'ahh_admin'`, `SESSION_TTL_MS` (7 días)
  - `hashPassword(password: string): string`, `verifyPassword(password: string, stored: string): boolean`
  - `parseUsers(raw: string): AdminUser[]`, `findUser(users: AdminUser[], email: string): AdminUser | undefined`
  - `signSession(email: string, secret: string, now?: number): string`, `verifySession(token: string, secret: string, now?: number): string | null`
  - `createThrottle(max?: number, windowMs?: number)` → `{ isBlocked(key, now?), fail(key, now?), reset(key) }`; `loginThrottle`
  - `getServerEnv()` (ver Task 3)

- [ ] **Step 1: Tests que fallan**

`src/lib/auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findUser, hashPassword, parseUsers, SESSION_TTL_MS, signSession, verifyPassword, verifySession } from './auth';

describe('contraseñas', () => {
  const stored = hashPassword('una-contraseña-larga');

  it('verifica la correcta y rechaza otra', () => {
    expect(verifyPassword('una-contraseña-larga', stored)).toBe(true);
    expect(verifyPassword('otra-contraseña', stored)).toBe(false);
  });

  it('usa sal distinta en cada hash', () => {
    expect(hashPassword('x'.repeat(12))).not.toBe(hashPassword('x'.repeat(12)));
  });

  it('rechaza hashes mal formados sin lanzar', () => {
    expect(verifyPassword('a', 'texto')).toBe(false);
    expect(verifyPassword('a', 'scrypt$abc$8$1$c2FsdA$aGFzaA')).toBe(false);
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
```

`src/lib/throttle.test.ts`:

```ts
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
```

Run: `npx vitest run src/lib/auth.test.ts src/lib/throttle.test.ts` → FAIL (módulos no existen).

- [ ] **Step 2: `src/lib/auth.ts`**

(Solo sintaxis TS borrable: `scripts/admin-user.ts` lo importa con `node`.)

```ts
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'astro/zod';

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
```

- [ ] **Step 3: `src/lib/throttle.ts`**

```ts
/* Límite de intentos de login. Vive en la memoria de cada función de Vercel,
   así que es de mejor esfuerzo: frena ataques desde una instancia, no un
   ataque distribuido. Para eso está la espera fija en cada fallo. */
export function createThrottle(max = 5, windowMs = 15 * 60 * 1000) {
  const failures = new Map<string, number[]>();
  const recent = (key: string, now: number) => (failures.get(key) ?? []).filter(t => now - t < windowMs);
  return {
    isBlocked: (key: string, now = Date.now()) => recent(key, now).length >= max,
    fail: (key: string, now = Date.now()) => {
      failures.set(key, [...recent(key, now), now]);
    },
    reset: (key: string) => {
      failures.delete(key);
    },
  };
}

export const loginThrottle = createThrottle();
```

Run: `npx vitest run src/lib/auth.test.ts src/lib/throttle.test.ts` → PASS.

- [ ] **Step 4: `src/lib/env.ts`**

```ts
import { ADMIN_USERS, GITHUB_BRANCH, GITHUB_REPO, GITHUB_TOKEN, SESSION_SECRET } from 'astro:env/server';
import { parseUsers, type AdminUser } from './auth';

export type ServerEnv = {
  users: AdminUser[];
  sessionSecret: string;
  github: { token: string; repo: string; branch: string };
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name} (ver .env.example).`);
  return value;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const sessionSecret = required('SESSION_SECRET', SESSION_SECRET);
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  cached = {
    users: parseUsers(required('ADMIN_USERS', ADMIN_USERS)),
    sessionSecret,
    github: { token: required('GITHUB_TOKEN', GITHUB_TOKEN), repo: GITHUB_REPO, branch: GITHUB_BRANCH },
  };
  return cached;
}
```

- [ ] **Step 5: `scripts/admin-user.ts`**

```ts
import { createInterface } from 'node:readline';
import { hashPassword } from '../src/lib/auth.ts';

/* Genera una entrada para ADMIN_USERS sin que la contraseña quede en el
   historial de la terminal. Uso: npm run admin:user -- correo "Nombre" */
const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();

if (!email || !name) {
  console.error('Uso: npm run admin:user -- correo@ejemplo.com "Nombre Apellido"');
  process.exit(1);
}

function askHidden(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void };
    output._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
    rl.question(question, answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askHidden('Contraseña (mínimo 10 caracteres): ');
if (password.length < 10) {
  console.error('La contraseña debe tener al menos 10 caracteres.');
  process.exit(1);
}
if ((await askHidden('Repite la contraseña: ')) !== password) {
  console.error('Las contraseñas no coinciden.');
  process.exit(1);
}

console.log(`\n${JSON.stringify({ email: email.toLowerCase(), name, hash: hashPassword(password) })}`);
console.log('\nAgrega este objeto al arreglo de ADMIN_USERS: [ {...}, {...} ]');
```

En `package.json` → `scripts`: `"admin:user": "node scripts/admin-user.ts"`.

Run (prueba manual): `printf 'contraseña-larga\ncontraseña-larga\n' | npm run admin:user -- prueba@ahh.mx "Prueba"` → imprime una línea JSON con `"hash":"scrypt$16384$8$1$…"`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts src/lib/throttle.ts src/lib/throttle.test.ts src/lib/env.ts scripts/admin-user.ts package.json
git commit -m "feat(admin): password hashing, signed sessions and login throttle"
```

---

### Task 5: Cliente de la API de GitHub

**Files:**
- Create: `src/lib/github.ts`, `src/lib/github.test.ts`

**Interfaces:**
- Produces:
  - `type GitHubConfig = { token: string; repo: string; branch: string }`
  - `type CommitFile = { path: string; content: string } | { path: string; blobSha: string } | { path: string; delete: true }`
  - `type DeployState = 'pending' | 'success' | 'failure'`
  - `type HistoryEntry = { sha: string; message: string; author: string; date: string }`
  - `class GitHubError extends Error { status: number }`, `class ConflictError extends Error`
  - `createGitHub(config, fetchImpl?)` → `{ readJson(path): Promise<{ data: unknown; sha: string }>; createBlob(bytes: Uint8Array): Promise<string>; commit(opts: { message: string; author: { name: string; email: string }; files: CommitFile[]; guard?: { path: string; sha: string } }): Promise<string>; history(path: string, limit?: number): Promise<HistoryEntry[]>; deployState(sha: string): Promise<DeployState> }`; `type GitHub = ReturnType<typeof createGitHub>`

- [ ] **Step 1: Tests que fallan**

`src/lib/github.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ConflictError, createGitHub, GitHubError } from './github';

type Handler = (body: any, call: number) => { status?: number; json?: unknown };

function fakeGitHub(routes: Record<string, Handler>) {
  const calls: { method: string; path: string; body: any }[] = [];
  const counts = new Map<string, number>();
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    const path = String(url).replace('https://api.github.com/repos/o/r', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const key = `${method} ${path}`;
    const handler = routes[key];
    if (!handler) return new Response('{}', { status: 404 });
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    const out = handler(body, n);
    return new Response(JSON.stringify(out.json ?? {}), { status: out.status ?? 200 });
  };
  return { gh: createGitHub({ token: 't', repo: 'o/r', branch: 'main' }, fetchImpl as typeof fetch), calls };
}

const PATH = 'src/content/properties.json';
const author = { name: 'Omar', email: 'panel@ahh-construccion.invalid' };

describe('readJson', () => {
  it('decodifica el contenido y devuelve el sha', async () => {
    const { gh, calls } = fakeGitHub({
      [`GET /contents/${PATH}?ref=main`]: () => ({ json: { sha: 'abc', content: Buffer.from('[{"a":1}]').toString('base64') } }),
    });
    expect(await gh.readJson(PATH)).toEqual({ data: [{ a: 1 }], sha: 'abc' });
    expect(calls[0]).toMatchObject({ method: 'GET' });
  });

  it('lanza GitHubError con el status', async () => {
    const { gh } = fakeGitHub({});
    await expect(gh.readJson(PATH)).rejects.toMatchObject({ status: 404 });
  });
});

describe('commit', () => {
  const happy = (overrides: Record<string, Handler> = {}) => ({
    'GET /git/ref/heads/main': () => ({ json: { object: { sha: 'head1' } } }),
    [`GET /contents/${PATH}?ref=head1`]: () => ({ json: { sha: 'file1' } }),
    'GET /git/commits/head1': () => ({ json: { tree: { sha: 'tree1' } } }),
    'POST /git/trees': () => ({ json: { sha: 'tree2' } }),
    'POST /git/commits': () => ({ json: { sha: 'commit2' } }),
    'PATCH /git/refs/heads/main': () => ({ json: {} }),
    ...overrides,
  });

  it('arma un tree con contenido, blobs y borrados y mueve la rama sin force', async () => {
    const { gh, calls } = fakeGitHub(happy());
    const sha = await gh.commit({
      message: 'Panel: prueba',
      author,
      guard: { path: PATH, sha: 'file1' },
      files: [
        { path: PATH, content: '[]\n' },
        { path: 'public/img/propiedades/x/a.jpg', blobSha: 'blob1' },
        { path: 'public/img/propiedades/x/b.jpg', delete: true },
      ],
    });
    expect(sha).toBe('commit2');
    const tree = calls.find(c => c.path === '/git/trees')!.body;
    expect(tree.base_tree).toBe('tree1');
    expect(tree.tree).toEqual([
      { path: PATH, mode: '100644', type: 'blob', content: '[]\n' },
      { path: 'public/img/propiedades/x/a.jpg', mode: '100644', type: 'blob', sha: 'blob1' },
      { path: 'public/img/propiedades/x/b.jpg', mode: '100644', type: 'blob', sha: null },
    ]);
    expect(calls.find(c => c.path === '/git/commits')!.body).toEqual({ message: 'Panel: prueba', tree: 'tree2', parents: ['head1'], author });
    expect(calls.find(c => c.method === 'PATCH')!.body).toEqual({ sha: 'commit2', force: false });
  });

  it('lanza ConflictError si el archivo cambió desde que se leyó', async () => {
    const { gh, calls } = fakeGitHub(happy());
    await expect(gh.commit({ message: 'm', author, guard: { path: PATH, sha: 'viejo' }, files: [] })).rejects.toBeInstanceOf(ConflictError);
    expect(calls.some(c => c.path === '/git/trees')).toBe(false);
  });

  it('reintenta una vez si la rama se movió entre medio', async () => {
    const { gh, calls } = fakeGitHub(happy({
      'GET /git/ref/heads/main': (_b, n) => ({ json: { object: { sha: n === 1 ? 'head1' : 'head2' } } }),
      [`GET /contents/${PATH}?ref=head2`]: () => ({ json: { sha: 'file1' } }),
      'GET /git/commits/head2': () => ({ json: { tree: { sha: 'tree9' } } }),
      'PATCH /git/refs/heads/main': (_b, n) => (n === 1 ? { status: 422 } : { json: {} }),
    }));
    await gh.commit({ message: 'm', author, guard: { path: PATH, sha: 'file1' }, files: [{ path: PATH, content: '[]\n' }] });
    const commits = calls.filter(c => c.path === '/git/commits');
    expect(commits.map(c => c.body.parents[0])).toEqual(['head1', 'head2']);
  });

  it('no reintenta más de una vez', async () => {
    const { gh } = fakeGitHub(happy({ 'PATCH /git/refs/heads/main': () => ({ status: 422 }) }));
    await expect(gh.commit({ message: 'm', author, files: [] })).rejects.toBeInstanceOf(GitHubError);
  });
});

describe('deployState', () => {
  const withStatus = (state?: string) => fakeGitHub({
    'GET /deployments?sha=c1&per_page=5': () => ({ json: state === undefined ? [] : [{ id: 7 }] }),
    'GET /deployments/7/statuses?per_page=1': () => ({ json: [{ state }] }),
  }).gh;

  it('traduce los estados de Vercel', async () => {
    expect(await withStatus(undefined).deployState('c1')).toBe('pending');
    expect(await withStatus('in_progress').deployState('c1')).toBe('pending');
    expect(await withStatus('success').deployState('c1')).toBe('success');
    expect(await withStatus('error').deployState('c1')).toBe('failure');
    expect(await withStatus('failure').deployState('c1')).toBe('failure');
  });
});

describe('history', () => {
  it('devuelve la primera línea del mensaje', async () => {
    const { gh } = fakeGitHub({
      'GET /commits?sha=main&path=src%2Fcontent&per_page=10': () => ({
        json: [{ sha: 's1', commit: { message: 'Panel: precio\n\ncuerpo', author: { name: 'Omar', date: '2026-11-24T10:00:00Z' } } }],
      }),
    });
    expect(await gh.history('src/content')).toEqual([{ sha: 's1', message: 'Panel: precio', author: 'Omar', date: '2026-11-24T10:00:00Z' }]);
  });
});
```

Run: `npx vitest run src/lib/github.test.ts` → FAIL.

- [ ] **Step 2: `src/lib/github.ts`**

```ts
/* Cliente mínimo de la API de GitHub para el panel. Cada guardado es un solo
   commit (Git Data API), así que datos y fotos llegan juntos o no llegan. */

export type GitHubConfig = { token: string; repo: string; branch: string };
export type CommitFile = { path: string; content: string } | { path: string; blobSha: string } | { path: string; delete: true };
export type DeployState = 'pending' | 'success' | 'failure';
export type HistoryEntry = { sha: string; message: string; author: string; date: string };

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends Error {}

export function createGitHub(config: GitHubConfig, fetchImpl: typeof fetch = fetch) {
  const base = `https://api.github.com/repos/${config.repo}`;

  async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const method = init.method ?? 'GET';
    const res = await fetchImpl(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!res.ok) throw new GitHubError(`GitHub respondió ${res.status} en ${method} ${path}`, res.status);
    return (await res.json()) as T;
  }

  const contents = (path: string, ref: string) =>
    `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`;

  async function fileSha(path: string, ref: string): Promise<string | null> {
    try {
      return (await api<{ sha: string }>(contents(path, ref))).sha;
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  }

  function treeEntry(file: CommitFile) {
    const entry = { path: file.path, mode: '100644', type: 'blob' };
    if ('delete' in file) return { ...entry, sha: null };
    if ('blobSha' in file) return { ...entry, sha: file.blobSha };
    return { ...entry, content: file.content };
  }

  return {
    async readJson(path: string): Promise<{ data: unknown; sha: string }> {
      const file = await api<{ content: string; sha: string }>(contents(path, config.branch));
      return { data: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), sha: file.sha };
    },

    async createBlob(bytes: Uint8Array): Promise<string> {
      const blob = await api<{ sha: string }>('/git/blobs', {
        method: 'POST',
        body: { content: Buffer.from(bytes).toString('base64'), encoding: 'base64' },
      });
      return blob.sha;
    },

    async commit(options: {
      message: string;
      author: { name: string; email: string };
      files: CommitFile[];
      guard?: { path: string; sha: string };
    }): Promise<string> {
      for (let attempt = 0; ; attempt++) {
        const head = (await api<{ object: { sha: string } }>(`/git/ref/heads/${config.branch}`)).object.sha;
        if (options.guard && (await fileSha(options.guard.path, head)) !== options.guard.sha) throw new ConflictError();
        const baseTree = (await api<{ tree: { sha: string } }>(`/git/commits/${head}`)).tree.sha;
        const tree = await api<{ sha: string }>('/git/trees', {
          method: 'POST',
          body: { base_tree: baseTree, tree: options.files.map(treeEntry) },
        });
        const created = await api<{ sha: string }>('/git/commits', {
          method: 'POST',
          body: { message: options.message, tree: tree.sha, parents: [head], author: options.author },
        });
        try {
          await api(`/git/refs/heads/${config.branch}`, { method: 'PATCH', body: { sha: created.sha, force: false } });
          return created.sha;
        } catch (error) {
          // 422 = la rama avanzó entre la lectura y el push. Un reintento sobre
          // el HEAD nuevo; el guard vuelve a revisar que nadie tocó el archivo.
          if (error instanceof GitHubError && error.status === 422 && attempt === 0) continue;
          throw error;
        }
      }
    },

    async history(path: string, limit = 10): Promise<HistoryEntry[]> {
      const commits = await api<Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>>(
        `/commits?sha=${encodeURIComponent(config.branch)}&path=${encodeURIComponent(path)}&per_page=${limit}`,
      );
      return commits.map(c => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
      }));
    },

    /* Vercel registra cada deploy como "deployment" de GitHub del commit. */
    async deployState(sha: string): Promise<DeployState> {
      const deployments = await api<Array<{ id: number }>>(`/deployments?sha=${sha}&per_page=5`);
      if (deployments.length === 0) return 'pending';
      const [status] = await api<Array<{ state: string }>>(`/deployments/${deployments[0].id}/statuses?per_page=1`);
      if (status?.state === 'success') return 'success';
      if (status?.state === 'failure' || status?.state === 'error') return 'failure';
      return 'pending';
    },
  };
}

export type GitHub = ReturnType<typeof createGitHub>;
```

Run: `npx vitest run src/lib/github.test.ts` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/github.ts src/lib/github.test.ts
git commit -m "feat(admin): GitHub client with atomic commits and conflict guard"
```

---

### Task 6: Plan de guardado y API de contenido, fotos, estado e historial

**Files:**
- Create: `src/lib/content-files.ts`, `src/lib/save.ts`, `src/lib/save.test.ts`, `src/lib/server.ts`, `src/pages/admin/api/content/[name].ts`, `src/pages/admin/api/photo.ts`, `src/pages/admin/api/status.ts`, `src/pages/admin/api/history.ts`

**Interfaces:**
- Consumes: schemas (Task 1), `CommitFile`, `createGitHub`, `ConflictError` (Task 5), `getServerEnv` (Task 4).
- Produces:
  - `contentFiles` (`properties | projects | settings | services` → `{ path, schema }`), `type ContentName`, `isContentName(name)`
  - `PHOTO_REPO_PATH: RegExp`, `type FieldError = { path: string; message: string }`, `type SavePayload` (cuerpo del PUT)
  - `planSave(name: string, body: unknown): SavePlan` donde el caso `ok: true` trae `{ path, baseSha, newSha, message, files }`
  - `gitBlobSha(content: string): string`, `isJpeg(bytes: Uint8Array): boolean`
  - `json(body, status?)`, `github()`, `rawBaseUrl()`, `COMMIT_EMAIL`
  - Endpoints: `GET/PUT /admin/api/content/:name`, `POST /admin/api/photo`, `GET /admin/api/status?sha=`, `GET /admin/api/history`

- [ ] **Step 1: Tests que fallan**

`src/lib/save.test.ts`:

```ts
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
```

Run: `npx vitest run src/lib/save.test.ts` → FAIL.

- [ ] **Step 2: `src/lib/content-files.ts`**

```ts
import { projectsSchema, propertiesSchema, servicesSchema, settingsSchema } from './schema';

/* Lo único que el panel puede escribir, además de fotos. */
export const contentFiles = {
  properties: { path: 'src/content/properties.json', schema: propertiesSchema },
  projects: { path: 'src/content/projects.json', schema: projectsSchema },
  settings: { path: 'src/content/settings.json', schema: settingsSchema },
  services: { path: 'src/content/services.json', schema: servicesSchema },
} as const;

export type ContentName = keyof typeof contentFiles;

export const isContentName = (name: string): name is ContentName => Object.hasOwn(contentFiles, name);
```

- [ ] **Step 3: `src/lib/save.ts`**

```ts
import { createHash } from 'node:crypto';
import { z } from 'astro/zod';
import { contentFiles, isContentName } from './content-files';
import type { CommitFile } from './github';

export const PHOTO_REPO_PATH = /^public\/img\/(propiedades|proyectos)\/[a-z0-9-]+\/[a-z0-9-]+(-sm)?\.jpg$/;

const gitSha = z.string().regex(/^[0-9a-f]{40}$/);
const photoPath = z.string().regex(PHOTO_REPO_PATH);

const saveRequestSchema = z.object({
  data: z.unknown(),
  baseSha: gitSha,
  summary: z.string().trim().min(1).max(120),
  photos: z
    .object({
      add: z.array(z.object({ path: photoPath, blobSha: gitSha })).default([]),
      remove: z.array(photoPath).default([]),
    })
    .default({ add: [], remove: [] }),
});

export type SavePayload = z.input<typeof saveRequestSchema>;
export type FieldError = { path: string; message: string };
export type SavePlan =
  | { ok: true; path: string; baseSha: string; newSha: string; message: string; files: CommitFile[] }
  | { ok: false; status: 400 | 404 | 422; error: string; fieldErrors?: FieldError[] };

/* El sha que GitHub dará al archivo nuevo: el cliente lo usa como baseSha del
   siguiente guardado sin volver a leerlo. */
export function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export const isJpeg = (bytes: Uint8Array) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

export function planSave(name: string, body: unknown): SavePlan {
  if (!isContentName(name)) return { ok: false, status: 404, error: 'Sección desconocida.' };
  const request = saveRequestSchema.safeParse(body);
  if (!request.success) return { ok: false, status: 400, error: 'Solicitud inválida.' };

  const { path, schema } = contentFiles[name];
  const parsed = (schema as z.ZodType).safeParse(request.data.data);
  if (!parsed.success) {
    return {
      ok: false,
      status: 422,
      error: 'Revisa los campos marcados.',
      fieldErrors: parsed.error.issues.map(issue => ({ path: issue.path.map(String).join('.'), message: issue.message })),
    };
  }

  const content = `${JSON.stringify(parsed.data, null, 2)}\n`;
  const { add, remove } = request.data.photos;
  return {
    ok: true,
    path,
    baseSha: request.data.baseSha,
    newSha: gitBlobSha(content),
    message: `Panel: ${request.data.summary}`,
    files: [
      { path, content },
      ...add.map(photo => ({ path: photo.path, blobSha: photo.blobSha })),
      ...remove.map(photo => ({ path: photo, delete: true as const })),
    ],
  };
}
```

Run: `npx vitest run src/lib/save.test.ts` → PASS.

- [ ] **Step 4: `src/lib/server.ts`**

```ts
import { getServerEnv } from './env';
import { createGitHub } from './github';

export const COMMIT_EMAIL = 'panel@ahh-construccion.invalid';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const github = () => createGitHub(getServerEnv().github);

/* El repo es público: las fotos recién subidas se ven desde aquí antes de que
   termine el deploy. */
export const rawBaseUrl = () => {
  const { repo, branch } = getServerEnv().github;
  return `https://raw.githubusercontent.com/${repo}/${branch}/public`;
};
```

- [ ] **Step 5: Endpoints**

`src/pages/admin/api/content/[name].ts`:

```ts
import type { APIRoute } from 'astro';
import { contentFiles, isContentName } from '../../../../lib/content-files';
import { ConflictError } from '../../../../lib/github';
import { planSave } from '../../../../lib/save';
import { COMMIT_EMAIL, github, json } from '../../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = params.name ?? '';
  if (!isContentName(name)) return json({ error: 'Sección desconocida.' }, 404);
  try {
    return json(await github().readJson(contentFiles[name].path));
  } catch (error) {
    console.error('[admin] lectura falló', error);
    return json({ error: 'No se pudo leer el contenido. Intenta en un momento.' }, 502);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const plan = planSave(params.name ?? '', await request.json().catch(() => null));
  if (!plan.ok) return json({ error: plan.error, fieldErrors: plan.fieldErrors ?? [] }, plan.status);
  try {
    const commit = await github().commit({
      message: plan.message,
      author: { name: locals.user?.name ?? 'Panel', email: COMMIT_EMAIL },
      files: plan.files,
      guard: { path: plan.path, sha: plan.baseSha },
    });
    return json({ commit, sha: plan.newSha });
  } catch (error) {
    if (error instanceof ConflictError) {
      return json({ error: 'Alguien guardó cambios mientras editabas. Recarga la página para ver la versión actual.' }, 409);
    }
    console.error('[admin] commit falló', error);
    return json({ error: 'No se pudo guardar. Tus cambios siguen en pantalla; intenta en un momento.' }, 502);
  }
};
```

`src/pages/admin/api/photo.ts`:

```ts
import type { APIRoute } from 'astro';
import { isJpeg } from '../../../lib/save';
import { github, json } from '../../../lib/server';

export const prerender = false;

// Una foto de 1800 px pesa ~300 KB; 3 MB deja margen sin acercarse al límite
// de 4.5 MB por petición de Vercel.
const MAX_BYTES = 3 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_BYTES) return json({ error: 'La foto es demasiado grande.' }, 413);
  if (!isJpeg(bytes)) return json({ error: 'Solo se aceptan fotos JPG.' }, 415);
  try {
    return json({ blobSha: await github().createBlob(bytes) });
  } catch (error) {
    console.error('[admin] subida falló', error);
    return json({ error: 'No se pudo subir la foto. Intenta de nuevo.' }, 502);
  }
};
```

`src/pages/admin/api/status.ts`:

```ts
import type { APIRoute } from 'astro';
import { github, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const sha = url.searchParams.get('sha') ?? '';
  if (!/^[0-9a-f]{40}$/.test(sha)) return json({ error: 'Commit inválido.' }, 400);
  try {
    return json({ state: await github().deployState(sha) });
  } catch (error) {
    console.error('[admin] estado falló', error);
    return json({ error: 'No se pudo consultar la publicación.' }, 502);
  }
};
```

`src/pages/admin/api/history.ts`:

```ts
import type { APIRoute } from 'astro';
import { github, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return json(await github().history('src/content', 10));
  } catch (error) {
    console.error('[admin] historial falló', error);
    return json({ error: 'No se pudo leer el historial.' }, 502);
  }
};
```

- [ ] **Step 6: Verificar build y tests**

Run: `npx vitest run && npx astro build 2>&1 | tail -3` → todo PASS y build OK.

- [ ] **Step 7: Commit**

```bash
git add src/lib/content-files.ts src/lib/save.ts src/lib/save.test.ts src/lib/server.ts src/pages/admin/api
git commit -m "feat(admin): content, photo, deploy status and history endpoints"
```

---

### Task 7: Middleware, login y layout del panel

**Files:**
- Create: `src/lib/origin.ts`, `src/lib/origin.test.ts`, `src/middleware.ts`, `src/pages/admin/api/login.ts`, `src/pages/admin/api/logout.ts`, `src/layouts/AdminLayout.astro`, `src/pages/admin/login.astro`, `src/pages/admin/index.astro` (temporal: "Hola, nombre"; Task 9 lo completa)

**Interfaces:**
- Consumes: auth (Task 4), `getServerEnv`, `json`.
- Produces: `isSameOrigin(request: Request): boolean`; `Astro.locals.user` en todo `/admin` menos login; `AdminLayout` con props `{ title: string; active?: 'inicio' | 'propiedades' | 'proyectos' | 'contacto' | 'servicios' }`.

- [ ] **Step 1: Test que falla**

`src/lib/origin.test.ts`:

```ts
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
```

Run: `npx vitest run src/lib/origin.test.ts` → FAIL.

- [ ] **Step 2: `src/lib/origin.ts`**

```ts
/* CSRF: además de SameSite=Strict, toda petición que no sea GET debe venir de
   una página del mismo host. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
```

Run: `npx vitest run src/lib/origin.test.ts` → PASS.

- [ ] **Step 3: `src/middleware.ts`**

```ts
import { defineMiddleware } from 'astro:middleware';
import { findUser, SESSION_COOKIE, verifySession } from './lib/auth';
import { getServerEnv } from './lib/env';
import { isSameOrigin } from './lib/origin';
import { json } from './lib/server';

const PUBLIC_PATHS = new Set(['/admin/login', '/admin/api/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/+$/, '') || '/';
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  if (context.isPrerendered || !isAdmin) return next();

  const isApi = path.startsWith('/admin/api/');
  if (context.request.method !== 'GET' && !isSameOrigin(context.request)) {
    return json({ error: 'Origen no permitido.' }, 403);
  }

  if (!PUBLIC_PATHS.has(path)) {
    const env = getServerEnv();
    const email = verifySession(context.cookies.get(SESSION_COOKIE)?.value ?? '', env.sessionSecret);
    // Quitar a alguien de ADMIN_USERS le quita el acceso aunque su cookie siga viva.
    const user = email ? findUser(env.users, email) : undefined;
    if (!user) {
      context.cookies.delete(SESSION_COOKIE, { path: '/admin' });
      return isApi
        ? json({ error: 'Tu sesión expiró. Vuelve a entrar.' }, 401)
        : context.redirect(`/admin/login?next=${encodeURIComponent(path)}`);
    }
    context.locals.user = { email: user.email, name: user.name };
  }

  const response = await next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
```

- [ ] **Step 4: Login y logout**

`src/pages/admin/api/login.ts`:

```ts
import type { APIRoute } from 'astro';
import { findUser, hashPassword, SESSION_COOKIE, SESSION_TTL_MS, signSession, verifyPassword } from '../../../lib/auth';
import { getServerEnv } from '../../../lib/env';
import { json } from '../../../lib/server';
import { loginThrottle } from '../../../lib/throttle';

export const prerender = false;

// Con un correo inexistente se verifica igual contra este hash, para que el
// tiempo de respuesta no revele qué correos existen.
let dummyHash: string | undefined;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  let ip = 'desconocida';
  try {
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress;
  } catch {
    /* algunos entornos no exponen la IP */
  }
  const key = `${email}|${ip}`;
  if (loginThrottle.isBlocked(key)) {
    return json({ error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' }, 429);
  }

  const env = getServerEnv();
  const user = findUser(env.users, email);
  dummyHash ??= hashPassword('contraseña-de-relleno');
  const valid = verifyPassword(password, user?.hash ?? dummyHash) && Boolean(user);

  if (!user || !valid) {
    loginThrottle.fail(key);
    await new Promise(resolve => setTimeout(resolve, 400));
    return json({ error: 'Correo o contraseña incorrectos.' }, 401);
  }

  loginThrottle.reset(key);
  cookies.set(SESSION_COOKIE, signSession(user.email, env.sessionSecret), {
    path: '/admin',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return json({ ok: true });
};
```

`src/pages/admin/api/logout.ts`:

```ts
import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../../lib/auth';
import { json } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
  return json({ ok: true });
};
```

- [ ] **Step 5: `src/layouts/AdminLayout.astro`**

```astro
---
import '../styles/global.css';

type Section = 'inicio' | 'propiedades' | 'proyectos' | 'contacto' | 'servicios';
interface Props {
  title: string;
  active?: Section;
}

const { title, active } = Astro.props;
const user = Astro.locals.user;
const nav: { id: Section; href: string; label: string }[] = [
  { id: 'inicio', href: '/admin', label: 'Inicio' },
  { id: 'propiedades', href: '/admin/propiedades', label: 'Propiedades' },
  { id: 'proyectos', href: '/admin/proyectos', label: 'Proyectos' },
  { id: 'contacto', href: '/admin/contacto', label: 'Contacto' },
  { id: 'servicios', href: '/admin/servicios', label: 'Servicios' },
];
---

<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <title>{title} · Panel AHH</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-bone text-dark font-sans antialiased min-h-screen">
    {user ? (
      <div class="lg:flex min-h-screen">
        <aside class="bg-dark text-white lg:w-60 lg:fixed lg:inset-y-0 flex lg:flex-col">
          <div class="flex items-center justify-between w-full lg:block px-4 py-3 lg:px-6 lg:py-6">
            <a href="/admin" class="block">
              <img src="/logo/logo-horizontal-negativo.png" alt="AHH" class="h-8 lg:h-10" />
              <span class="hidden lg:block text-[11px] tracking-[0.14em] uppercase text-sand/70 mt-2">Panel</span>
            </a>
            <button id="admin-logout" type="button" class="lg:hidden text-sm text-sand underline">Salir</button>
          </div>
          <nav class="hidden lg:flex flex-col gap-1 px-3 flex-1" aria-label="Panel">
            {nav.map(item => (
              <a
                href={item.href}
                aria-current={active === item.id ? 'page' : undefined}
                class:list={['rounded-md px-3 py-2 text-sm', active === item.id ? 'bg-dark-3 text-white font-semibold' : 'text-sand hover:bg-dark-2']}
              >{item.label}</a>
            ))}
          </nav>
          <div class="hidden lg:block px-6 py-6 text-sm border-t border-dark-3">
            <p class="text-sand/80 truncate">{user.name}</p>
            <a href="/" target="_blank" rel="noopener" class="block text-sand hover:text-white mt-3">Ver sitio ↗</a>
            <button id="admin-logout-desktop" type="button" class="text-sand hover:text-white mt-2">Salir</button>
          </div>
        </aside>
        <nav class="lg:hidden flex gap-1 overflow-x-auto bg-dark-2 px-2 py-2" aria-label="Panel">
          {nav.map(item => (
            <a
              href={item.href}
              aria-current={active === item.id ? 'page' : undefined}
              class:list={['shrink-0 rounded-md px-3 py-1.5 text-sm', active === item.id ? 'bg-dark-3 text-white font-semibold' : 'text-sand']}
            >{item.label}</a>
          ))}
        </nav>
        <main class="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-32">
          <div class="max-w-4xl"><slot /></div>
        </main>
      </div>
    ) : (
      <slot />
    )}

    <script>
      for (const id of ['admin-logout', 'admin-logout-desktop']) {
        document.getElementById(id)?.addEventListener('click', async () => {
          await fetch('/admin/api/logout', { method: 'POST' });
          location.href = '/admin/login';
        });
      }
    </script>
  </body>
</html>
```

- [ ] **Step 6: `src/pages/admin/login.astro`**

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';

export const prerender = false;

const next = Astro.url.searchParams.get('next') ?? '';
const safeNext = /^\/admin(\/[a-z0-9/-]*)?$/.test(next) ? next : '/admin';
---

<AdminLayout title="Entrar">
  <div class="min-h-screen flex items-center justify-center px-4 py-10">
    <form id="login-form" data-next={safeNext} class="w-full max-w-sm bg-white rounded-xl border border-sand/60 p-8 space-y-5" novalidate>
      <img src="/logo/logo-horizontal.png" alt="AHH Construcción y Remodelación" class="h-10" />
      <div>
        <h1 class="font-display text-2xl">Panel de administración</h1>
        <p class="text-sm text-gray-600 mt-1">Entra con tu correo y contraseña.</p>
      </div>
      <label class="block">
        <span class="block text-sm font-medium mb-1.5">Correo</span>
        <input name="email" type="email" autocomplete="username" required class="w-full rounded-md border border-sand px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/60" />
      </label>
      <label class="block">
        <span class="block text-sm font-medium mb-1.5">Contraseña</span>
        <input name="password" type="password" autocomplete="current-password" required class="w-full rounded-md border border-sand px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/60" />
      </label>
      <p id="login-error" role="alert" class="text-sm text-red-700 hidden"></p>
      <button type="submit" class="w-full rounded-md bg-dark text-white font-semibold py-3 hover:bg-dark-3 disabled:opacity-50">Entrar</button>
    </form>
  </div>
</AdminLayout>

<script>
  const form = document.getElementById('login-form') as HTMLFormElement;
  const error = document.getElementById('login-error') as HTMLParagraphElement;
  const button = form.querySelector('button') as HTMLButtonElement;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    button.disabled = true;
    error.classList.add('hidden');
    try {
      const res = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      if (res.ok) {
        location.href = form.dataset.next || '/admin';
        return;
      }
      const body = await res.json().catch(() => ({}));
      error.textContent = body.error ?? 'No se pudo entrar. Intenta de nuevo.';
    } catch {
      error.textContent = 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    }
    error.classList.remove('hidden');
    button.disabled = false;
  });
</script>
```

- [ ] **Step 7: `src/pages/admin/index.astro` temporal**

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';

export const prerender = false;
---

<AdminLayout title="Inicio" active="inicio">
  <h1 class="font-display text-3xl">Hola, {Astro.locals.user?.name}</h1>
</AdminLayout>
```

- [ ] **Step 8: Prueba manual del login**

Preparar `.env` local (no se commitea):

```bash
cp .env.example .env
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
HASH_LINE=$(printf 'contraseña-larga\ncontraseña-larga\n' | npm run -s admin:user -- prueba@ahh.mx "Prueba" | grep '^{')
TOKEN=$(gh auth token)
sed -i '' "s|^ADMIN_USERS=.*|ADMIN_USERS='[$HASH_LINE]'|; s|^SESSION_SECRET=.*|SESSION_SECRET=$SECRET|; s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=$TOKEN|" .env
git push origin main:admin-sandbox 2>/dev/null || git push origin HEAD:admin-sandbox
astro dev --background
```

(En local se usa el token de `gh` del desarrollador contra la rama `admin-sandbox`. En Vercel va el token fine-grained.)

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:4321/admin
curl -s -X POST -H 'Content-Type: application/json' -H 'Origin: http://localhost:4321' -d '{"email":"prueba@ahh.mx","password":"mala"}' http://localhost:4321/admin/api/login
curl -s -c /tmp/ahh-cookies -X POST -H 'Content-Type: application/json' -H 'Origin: http://localhost:4321' -d '{"email":"prueba@ahh.mx","password":"contraseña-larga"}' http://localhost:4321/admin/api/login
curl -s -b /tmp/ahh-cookies http://localhost:4321/admin | grep -o 'Hola, [^<]*'
curl -s -X POST -H 'Content-Type: application/json' -H 'Origin: https://malo.com' http://localhost:4321/admin/api/logout
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/
```

Expected, en orden: `302 …/admin/login?next=%2Fadmin`, `{"error":"Correo o contraseña incorrectos."}`, `{"ok":true}`, `Hola, Prueba`, `{"error":"Origen no permitido."}`, `200`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/origin.ts src/lib/origin.test.ts src/middleware.ts src/pages/admin src/layouts/AdminLayout.astro
git commit -m "feat(admin): session middleware, login and admin layout"
```

---

### Task 8: Base del cliente (helpers, API, fotos, campos, guardado)

**Files:**
- Create: `src/admin/format.ts`, `src/admin/format.test.ts`, `src/admin/api.ts`, `src/admin/draft.ts`, `src/admin/image.ts`, `src/admin/ui.ts`, `src/admin/useEditor.ts`, `src/admin/components/fields.tsx`, `src/admin/components/lists.tsx`, `src/admin/components/SaveBar.tsx`, `src/admin/components/Thumb.tsx`

**Interfaces:**
- Consumes: `FieldError`, `SavePayload` (Task 6, solo tipos).
- Produces:
  - `format.ts`: `slugify(text)`, `phoneToDigits(input)`, `digitsToPhone(digits)`, `newPhotoName(now?, random?)`, `errorFor(errors, path)`, `move<T>(list, from, to)`, `changedLabels(before, after, labels)`, `summarize(title, changes)`, `timeAgo(iso, now?)`
  - `api.ts`: `ApiError { status; fieldErrors }`, `saveContent(name, payload): Promise<{ commit: string; sha: string }>`, `uploadPhoto(jpeg: Blob): Promise<string>`, `fetchDeployState(sha): Promise<DeployState>`
  - `draft.ts`: `stashDraft(value)`, `takeDraft<T>()`
  - `image.ts`: `preparePhoto(file: File): Promise<{ full: Blob; small: Blob }>`
  - `useEditor<T>(name, initial, sha, savedSnapshot?)` → `{ value, setValue, saved: T, dirty, status, errors, save(summary, photos?, next?) => Promise<boolean>, restored }`; `type SaveStatus`
  - Componentes: `Field`, `TextInput`, `TextArea`, `NumberInput`, `Select`, `Checkbox`, `PhoneInput`, `RowActions`, `StringList`, `PairList`, `SaveBar`, `Thumb`; objeto `ui` con clases

- [ ] **Step 1: Tests que fallan de `format.ts`**

`src/admin/format.test.ts`:

```ts
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
```

Run: `npx vitest run src/admin/format.test.ts` → FAIL.

- [ ] **Step 2: `src/admin/format.ts`**

```ts
import type { FieldError } from '../lib/save';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/* El sitio guarda 52 + 10 dígitos. Si no se puede normalizar, devuelve los
   dígitos tal cual y el schema muestra el error. */
export function phoneToDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
  return local.length === 10 ? `52${local}` : digits;
}

export function digitsToPhone(digits: string): string {
  const local = digits.replace(/^52(?=\d{10}$)/, '');
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}

export function newPhotoName(now = Date.now(), random = Math.random): string {
  return `${now.toString(36)}${Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

export const errorFor = (errors: FieldError[], path: string) => errors.find(e => e.path === path)?.message;

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function changedLabels(before: object, after: object, labels: Record<string, string>): string[] {
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  return Object.keys(labels).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map(key => labels[key]);
}

export const summarize = (title: string, changes: string[]) =>
  (changes.length ? `${title} — ${changes.join(', ')}` : title).slice(0, 120);

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 24 * 60) return `hace ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
```

Run: `npx vitest run src/admin/format.test.ts` → PASS.

- [ ] **Step 3: `src/admin/api.ts` y `src/admin/draft.ts`**

```ts
import type { DeployState } from '../lib/github';
import type { FieldError, SavePayload } from '../lib/save';

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];
  constructor(message: string, status: number, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('Sin conexión. Revisa tu internet e intenta de nuevo.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'Algo salió mal. Intenta de nuevo.', res.status, body.fieldErrors ?? []);
  return body as T;
}

export const saveContent = (name: string, payload: SavePayload) =>
  request<{ commit: string; sha: string }>(`/admin/api/content/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const uploadPhoto = (jpeg: Blob) =>
  request<{ blobSha: string }>('/admin/api/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: jpeg,
  }).then(r => r.blobSha);

export const fetchDeployState = (sha: string) =>
  request<{ state: DeployState }>(`/admin/api/status?sha=${sha}`).then(r => r.state);
```

`src/admin/draft.ts`:

```ts
/* Si la sesión vence al guardar, el borrador sobrevive al login. */
const key = () => `ahh-draft:${location.pathname}`;

export function stashDraft(value: unknown) {
  try {
    sessionStorage.setItem(key(), JSON.stringify(value));
  } catch {
    /* sin almacenamiento: se pierde el borrador, no la sesión */
  }
}

export function takeDraft<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(key());
    if (!raw) return null;
    sessionStorage.removeItem(key());
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: `src/admin/image.ts`**

```ts
/* Las fotos llegan del celular a 5–20 MB; se reducen aquí, una sola
   decodificación por foto, a los dos tamaños que usa el sitio. */
const FULL = { side: 1800, quality: 0.82 };
const SMALL = { side: 720, quality: 0.78 };

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Este formato no se puede leer. Sube la foto en JPG o PNG.');
  }
}

function toJpeg(bitmap: ImageBitmap, side: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no pudo procesar la foto.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto.'))), 'image/jpeg', quality),
  );
}

export async function preparePhoto(file: File): Promise<{ full: Blob; small: Blob }> {
  const bitmap = await decode(file);
  try {
    return { full: await toJpeg(bitmap, FULL.side, FULL.quality), small: await toJpeg(bitmap, SMALL.side, SMALL.quality) };
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 5: `src/admin/ui.ts`**

```ts
export const ui = {
  label: 'block text-sm font-medium text-dark mb-1.5',
  input: 'w-full rounded-md border border-sand bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent',
  inputError: 'border-red-600 focus:ring-red-600/40',
  hint: 'block mt-1 text-xs text-gray-500',
  error: 'block mt-1 text-xs text-red-700',
  card: 'bg-white rounded-xl border border-sand/60 p-5 sm:p-6',
  h1: 'font-display text-3xl mb-2',
  h2: 'font-display text-lg mb-4',
  btn: 'inline-flex items-center justify-center gap-2 rounded-md bg-dark text-white text-sm font-semibold px-4 py-2.5 hover:bg-dark-3 disabled:opacity-40 disabled:cursor-not-allowed',
  btnGhost: 'inline-flex items-center justify-center gap-2 rounded-md border border-sand bg-white text-sm font-medium px-3 py-2 hover:bg-bone-2 disabled:opacity-40 disabled:cursor-not-allowed',
  btnDanger: 'inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-white text-red-700 text-sm font-medium px-3 py-2 hover:bg-red-50',
  iconBtn: 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sand bg-white text-sm hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed',
  badge: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  notice: 'rounded-lg border px-4 py-3 text-sm',
};
```

- [ ] **Step 6: `src/admin/useEditor.ts`**

```ts
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { SavePayload } from '../lib/save';
import type { FieldError } from '../lib/save';
import { ApiError, fetchDeployState, saveContent } from './api';
import { stashDraft, takeDraft } from './draft';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'publishing'; commit: string }
  | { kind: 'published' }
  | { kind: 'deploy-failed' }
  | { kind: 'error'; message: string };

/* Estado de un JSON editable: valor, sha base, guardado y seguimiento del
   deploy. `savedSnapshot` permite que una propiedad nueva cuente como cambio. */
export function useEditor<T>(name: string, initial: T, initialSha: string, savedSnapshot: T = initial) {
  const restored = useMemo(() => takeDraft<T>(), []);
  const [value, setValue] = useState<T>(restored ?? initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(savedSnapshot));
  const [sha, setSha] = useState(initialSha);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const dirty = JSON.stringify(value) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (status.kind !== 'publishing') return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      try {
        const state = await fetchDeployState(status.commit);
        if (stopped) return;
        if (state === 'success') return setStatus({ kind: 'published' });
        if (state === 'failure') return setStatus({ kind: 'deploy-failed' });
      } catch {
        /* un fallo de red no detiene el seguimiento */
      }
      if (!stopped && Date.now() - started < 10 * 60 * 1000) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status]);

  async function save(summary: string, photos?: SavePayload['photos'], next: T = value): Promise<boolean> {
    setStatus({ kind: 'saving' });
    setErrors([]);
    try {
      const result = await saveContent(name, { data: next, baseSha: sha, summary, photos });
      setSha(result.sha);
      setSaved(JSON.stringify(next));
      setValue(next);
      setStatus({ kind: 'publishing', commit: result.commit });
      return true;
    } catch (error) {
      const e = error instanceof ApiError ? error : new ApiError('Algo salió mal. Intenta de nuevo.', 0);
      if (e.status === 401) {
        stashDraft(next);
        location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
        return false;
      }
      setErrors(e.fieldErrors);
      setStatus({ kind: 'error', message: e.message });
      return false;
    }
  }

  return { value, setValue, saved: JSON.parse(saved) as T, dirty, status, errors, save, restored: restored !== null };
}
```

- [ ] **Step 7: Campos y listas**

`src/admin/components/fields.tsx`:

```tsx
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { digitsToPhone, phoneToDigits } from '../format';
import { ui } from '../ui';

type Base = { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, children }: Base & { children: ComponentChildren }) {
  return (
    <label class="block">
      <span class={ui.label}>{label}</span>
      {children}
      {error ? <span class={ui.error}>{error}</span> : hint ? <span class={ui.hint}>{hint}</span> : null}
    </label>
  );
}

const inputClass = (error?: string) => `${ui.input} ${error ? ui.inputError : ''}`;

export function TextInput({ label, error, hint, value, onInput, placeholder, type = 'text' }: Base & {
  value: string | undefined;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url';
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input class={inputClass(error)} type={type} value={value ?? ''} placeholder={placeholder} aria-invalid={Boolean(error)} onInput={e => onInput(e.currentTarget.value)} />
    </Field>
  );
}

export function TextArea({ label, error, hint, value, onInput, rows = 3 }: Base & {
  value: string;
  onInput: (value: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea class={inputClass(error)} rows={rows} value={value} aria-invalid={Boolean(error)} onInput={e => onInput(e.currentTarget.value)} />
    </Field>
  );
}

/* Guarda el texto mientras se escribe ("2." no se convierte en 2 a media
   captura) y entrega número o undefined. */
export function NumberInput({ label, error, hint, value, onChange }: Base & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value?.toString() ?? '');
  useEffect(() => {
    const current = text.trim() === '' ? undefined : Number(text.replace(',', '.'));
    if (current !== value) setText(value?.toString() ?? '');
  }, [value]);
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        class={inputClass(error)}
        type="text"
        inputMode="decimal"
        value={text}
        aria-invalid={Boolean(error)}
        onInput={e => {
          const raw = e.currentTarget.value;
          setText(raw);
          const parsed = Number(raw.replace(',', '.'));
          onChange(raw.trim() === '' || !Number.isFinite(parsed) ? undefined : parsed);
        }}
      />
    </Field>
  );
}

export function Select<V extends string>({ label, error, hint, value, options, onChange }: Base & {
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select class={inputClass(error)} value={value} onChange={e => onChange(e.currentTarget.value as V)}>
        {options.map(option => <option value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label class="flex items-start gap-3">
      <input type="checkbox" class="mt-1 h-4 w-4 accent-dark" checked={checked} onChange={e => onChange(e.currentTarget.checked)} />
      <span>
        <span class="text-sm font-medium">{label}</span>
        {hint && <span class={ui.hint}>{hint}</span>}
      </span>
    </label>
  );
}

export function PhoneInput({ label, error, hint, value, onChange }: Base & { value: string; onChange: (digits: string) => void }) {
  const [text, setText] = useState(digitsToPhone(value));
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        class={inputClass(error)}
        type="tel"
        inputMode="tel"
        placeholder="614 123 4567"
        value={text}
        aria-invalid={Boolean(error)}
        onInput={e => {
          setText(e.currentTarget.value);
          onChange(phoneToDigits(e.currentTarget.value));
        }}
      />
    </Field>
  );
}
```

`src/admin/components/lists.tsx`:

```tsx
import { move } from '../format';
import { ui } from '../ui';

export function RowActions({ index, count, onMove, onRemove, label }: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div class="flex gap-1">
      <button type="button" class={ui.iconBtn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Subir ${label}`}>↑</button>
      <button type="button" class={ui.iconBtn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Bajar ${label}`}>↓</button>
      <button type="button" class={ui.iconBtn} onClick={onRemove} aria-label={`Quitar ${label}`}>✕</button>
    </div>
  );
}

export function StringList({ label, items, onChange, addLabel, placeholder, errorAt }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  placeholder?: string;
  errorAt?: (index: number) => string | undefined;
}) {
  return (
    <fieldset>
      <legend class={ui.label}>{label}</legend>
      <div class="space-y-2">
        {items.map((item, i) => {
          const error = errorAt?.(i);
          return (
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <input
                  class={`${ui.input} ${error ? ui.inputError : ''}`}
                  value={item}
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                  onInput={e => onChange(items.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                />
                {error && <span class={ui.error}>{error}</span>}
              </div>
              <RowActions index={i} count={items.length} label={item || 'elemento'} onMove={to => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      <button type="button" class={`${ui.btnGhost} mt-2`} onClick={() => onChange([...items, ''])}>+ {addLabel}</button>
    </fieldset>
  );
}

type Pair = { label: string; value: string };

export function PairList({ label, items, onChange, addLabel, labelPlaceholder, valuePlaceholder, errorAt }: {
  label: string;
  items: Pair[];
  onChange: (items: Pair[]) => void;
  addLabel: string;
  labelPlaceholder: string;
  valuePlaceholder: string;
  errorAt?: (path: string) => string | undefined;
}) {
  const update = (i: number, patch: Partial<Pair>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <fieldset>
      <legend class={ui.label}>{label}</legend>
      <div class="space-y-2">
        {items.map((item, i) => {
          const error = errorAt?.(`${i}.label`) ?? errorAt?.(`${i}.value`);
          return (
            <div class="flex gap-2 items-start">
              <div class="flex-1 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <input class={ui.input} value={item.label} placeholder={labelPlaceholder} aria-label={`${label} ${i + 1}: nombre`} onInput={e => update(i, { label: e.currentTarget.value })} />
                <input class={ui.input} value={item.value} placeholder={valuePlaceholder} aria-label={`${label} ${i + 1}: detalle`} onInput={e => update(i, { value: e.currentTarget.value })} />
                {error && <span class={`${ui.error} sm:col-span-2`}>{error}</span>}
              </div>
              <RowActions index={i} count={items.length} label={item.label || 'renglón'} onMove={to => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      <button type="button" class={`${ui.btnGhost} mt-2`} onClick={() => onChange([...items, { label: '', value: '' }])}>+ {addLabel}</button>
    </fieldset>
  );
}
```

- [ ] **Step 8: `SaveBar` y `Thumb`**

`src/admin/components/SaveBar.tsx`:

```tsx
import type { SaveStatus } from '../useEditor';
import { ui } from '../ui';

const messages: Record<SaveStatus['kind'], string> = {
  idle: '',
  saving: 'Guardando…',
  publishing: 'Guardado. El sitio se actualiza en ~1 minuto…',
  published: 'Publicado. Ya se ve en el sitio.',
  'deploy-failed': 'La publicación falló; el sitio sigue mostrando la versión anterior. Avisa al desarrollador.',
  error: '',
};

export function SaveBar({ dirty, status, onSave, blocked, label = 'Guardar cambios' }: {
  dirty: boolean;
  status: SaveStatus;
  onSave: () => void;
  blocked?: string;
  label?: string;
}) {
  const message =
    blocked ??
    (status.kind === 'error'
      ? status.message
      : dirty && status.kind !== 'saving'
        ? 'Tienes cambios sin guardar.'
        : messages[status.kind] || 'Todo guardado.');
  const tone = status.kind === 'error' || status.kind === 'deploy-failed' ? 'text-red-700' : 'text-gray-700';
  return (
    <div class="fixed bottom-0 inset-x-0 lg:left-60 z-40 bg-white/95 backdrop-blur border-t border-sand/70 px-4 sm:px-6 lg:px-10 py-3">
      <div class="max-w-4xl flex items-center gap-4">
        <p class={`flex-1 text-sm ${tone}`} role="status" aria-live="polite">{message}</p>
        <button type="button" class={ui.btn} disabled={!dirty || Boolean(blocked) || status.kind === 'saving'} onClick={onSave}>
          {status.kind === 'saving' ? 'Guardando…' : label}
        </button>
      </div>
    </div>
  );
}
```

`src/admin/components/Thumb.tsx`:

```tsx
import { useState } from 'preact/hooks';

/* Prueba la foto publicada; si el deploy todavía no la trae, la toma del repo. */
export function Thumb({ src, rawBase, alt, class: className }: { src: string; rawBase: string; alt: string; class: string }) {
  const [url, setUrl] = useState(src);
  if (!url) return <div class={`${className} bg-bone-2`} aria-hidden="true" />;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      class={`${className} object-cover bg-bone-2`}
      onError={() => setUrl(current => (current === src && src.startsWith('/') ? rawBase + src : ''))}
    />
  );
}
```

- [ ] **Step 9: Verificar**

Run: `npx vitest run && npx astro check 2>&1 | tail -3` → PASS y sin errores de tipos.

- [ ] **Step 10: Commit**

```bash
git add src/admin
git commit -m "feat(admin): client helpers, form fields and save bar"
```

---

### Task 9: Inicio del panel

**Files:**
- Modify: `src/pages/admin/index.astro` (reemplazar el temporal)
- Create: `src/admin/components/DeployStatus.tsx`

**Interfaces:**
- Consumes: `github()`, `contentFiles`, `propertiesSchema`, `timeAgo`, `fetchDeployState`, `ui`.

- [ ] **Step 1: `DeployStatus.tsx`**

```tsx
import { useEffect, useState } from 'preact/hooks';
import type { DeployState } from '../../lib/github';
import { fetchDeployState } from '../api';

const copy: Record<DeployState, { text: string; tone: string }> = {
  pending: { text: 'Publicando el último cambio…', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
  success: { text: 'El sitio está al día con el último cambio.', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  failure: { text: 'La última publicación falló; el sitio sigue con la versión anterior. Avisa al desarrollador.', tone: 'bg-red-50 border-red-200 text-red-800' },
};

export default function DeployStatus({ commit }: { commit: string }) {
  const [state, setState] = useState<DeployState | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      const next = await fetchDeployState(commit).catch(() => null);
      if (stopped) return;
      if (next) setState(next);
      if (next !== 'success' && next !== 'failure') timer = setTimeout(poll, 5000);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [commit]);
  if (!state) return null;
  return <p class={`rounded-lg border px-4 py-3 text-sm ${copy[state].tone}`} role="status">{copy[state].text}</p>;
}
```

- [ ] **Step 2: `src/pages/admin/index.astro`**

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import DeployStatus from '../../admin/components/DeployStatus';
import { timeAgo } from '../../admin/format';
import { ui } from '../../admin/ui';
import { contentFiles } from '../../lib/content-files';
import type { HistoryEntry } from '../../lib/github';
import { propertiesSchema, type Property } from '../../lib/schema';
import { github } from '../../lib/server';

export const prerender = false;

let properties: Property[] = [];
let history: HistoryEntry[] = [];
let loadError = false;
try {
  const gh = github();
  const [file, commits] = await Promise.all([gh.readJson(contentFiles.properties.path), gh.history('src/content', 10)]);
  properties = propertiesSchema.parse(file.data);
  history = commits;
} catch (error) {
  console.error('[admin] inicio', error);
  loadError = true;
}

const visible = properties.filter(p => !p.hidden);
const counts = [
  { label: 'En venta', value: visible.filter(p => p.status === 'disponible').length },
  { label: 'Apartadas', value: visible.filter(p => p.status === 'apartado').length },
  { label: 'Vendidas', value: visible.filter(p => p.status === 'vendido').length },
  { label: 'Ocultas', value: properties.length - visible.length },
];
const shortcuts = [
  { href: '/admin/propiedades', title: 'Propiedades', text: 'Precios, estatus, fichas y fotos' },
  { href: '/admin/propiedades/nueva', title: 'Nueva propiedad', text: 'Publicar una casa o terreno' },
  { href: '/admin/proyectos', title: 'Proyectos', text: 'Obras entregadas que se muestran' },
  { href: '/admin/contacto', title: 'Contacto', text: 'Teléfono, WhatsApp, dirección, horario' },
  { href: '/admin/servicios', title: 'Servicios', text: 'Textos de los cuatro servicios' },
];
const firstName = Astro.locals.user?.name.split(' ')[0] ?? '';
---

<AdminLayout title="Inicio" active="inicio">
  <h1 class={ui.h1}>Hola, {firstName}</h1>
  <p class="text-gray-600 mb-8">Desde aquí actualizas el sitio. Cada cambio se publica solo en 1–2 minutos.</p>

  {loadError && (
    <p class={`${ui.notice} bg-red-50 border-red-200 text-red-800 mb-6`}>
      No se pudo leer el contenido. Recarga en un momento; si sigue, avisa al desarrollador.
    </p>
  )}

  <section class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" aria-label="Propiedades">
    {counts.map(c => (
      <a href="/admin/propiedades" class={`${ui.card} block hover:border-accent`}>
        <p class="font-display text-3xl">{c.value}</p>
        <p class="text-sm text-gray-600">{c.label}</p>
      </a>
    ))}
  </section>

  {history[0] && <div class="mb-8"><DeployStatus client:load commit={history[0].sha} /></div>}

  <section class="grid sm:grid-cols-2 gap-3 mb-10">
    {shortcuts.map(s => (
      <a href={s.href} class={`${ui.card} block hover:border-accent`}>
        <p class="font-semibold">{s.title} →</p>
        <p class="text-sm text-gray-600 mt-1">{s.text}</p>
      </a>
    ))}
  </section>

  <section class={ui.card}>
    <h2 class={ui.h2}>Últimos cambios</h2>
    {history.length === 0 ? (
      <p class="text-sm text-gray-600">Todavía no hay cambios hechos desde el panel.</p>
    ) : (
      <ul class="divide-y divide-sand/50">
        {history.map(h => (
          <li class="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span class="text-sm">{h.message.replace(/^Panel:\s*/, '')}</span>
            <span class="text-xs text-gray-500 shrink-0">{h.author} · {timeAgo(h.date)}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
</AdminLayout>
```

- [ ] **Step 3: Verificar**

Con el dev server y la cookie de la Task 7:
`curl -s -b /tmp/ahh-cookies http://localhost:4321/admin | grep -o 'En venta\|Últimos cambios' | sort -u` → ambas cadenas.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/index.astro src/admin/components/DeployStatus.tsx
git commit -m "feat(admin): dashboard with counts, deploy status and history"
```

---

### Task 10: Lista de propiedades (orden y visibilidad)

**Files:**
- Create: `src/pages/admin/propiedades/index.astro`, `src/admin/components/PropertyList.tsx`

**Interfaces:**
- Consumes: `useEditor`, `SaveBar`, `Thumb`, `move`, `photoUrl`, `statusLabel`, `Property`, `ui`, `rawBaseUrl()`.

- [ ] **Step 1: `PropertyList.tsx`**

```tsx
import { move } from '../format';
import { photoUrl, statusLabel, type Property } from '../../lib/schema';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { SaveBar } from './SaveBar';
import { Thumb } from './Thumb';

const statusTone: Record<Property['status'], string> = {
  disponible: 'bg-emerald-100 text-emerald-900',
  apartado: 'bg-amber-100 text-amber-900',
  vendido: 'bg-dark text-white',
};

export default function PropertyList({ initial, sha, rawBase }: { initial: Property[]; sha: string; rawBase: string }) {
  const editor = useEditor('properties', initial, sha);
  const list = editor.value;
  const update = (next: Property[]) => editor.setValue(next);

  return (
    <>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class={ui.h1}>Propiedades</h1>
          <p class="text-sm text-gray-600">El orden de esta lista es el del sitio. Las ocultas no se publican.</p>
        </div>
        <a href="/admin/propiedades/nueva" class={ui.btn}>+ Nueva</a>
      </div>

      <ul class="space-y-3">
        {list.map((p, i) => (
          <li class={`${ui.card} !p-3 sm:!p-4 flex items-center gap-3 sm:gap-4 ${p.hidden ? 'opacity-60' : ''}`}>
            <Thumb src={p.photos[0] ? photoUrl(p.photoDir, p.photos[0], true) : ''} rawBase={rawBase} alt="" class="h-16 w-20 sm:h-20 sm:w-28 rounded-md shrink-0" />
            <div class="flex-1 min-w-0">
              <a href={`/admin/propiedades/${p.slug}`} class="font-semibold hover:underline block truncate">{p.name}</a>
              <p class="text-sm text-gray-600 truncate">{p.price}</p>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span class={`${ui.badge} ${statusTone[p.status]}`}>{statusLabel[p.status]}</span>
                {p.hidden && <span class={`${ui.badge} bg-bone-2 text-gray-700`}>Oculta</span>}
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-1.5 items-end sm:items-center">
              <div class="flex gap-1">
                <button type="button" class={ui.iconBtn} disabled={i === 0} onClick={() => update(move(list, i, i - 1))} aria-label={`Subir ${p.name}`}>↑</button>
                <button type="button" class={ui.iconBtn} disabled={i === list.length - 1} onClick={() => update(move(list, i, i + 1))} aria-label={`Bajar ${p.name}`}>↓</button>
              </div>
              <button type="button" class={ui.btnGhost} onClick={() => update(list.map((x, j) => (j === i ? { ...x, hidden: x.hidden ? undefined : true } : x)))}>
                {p.hidden ? 'Mostrar' : 'Ocultar'}
              </button>
              <a href={`/admin/propiedades/${p.slug}`} class={ui.btnGhost}>Editar</a>
            </div>
          </li>
        ))}
      </ul>

      {list.length === 0 && <p class="text-gray-600">Aún no hay propiedades. Crea la primera con “+ Nueva”.</p>}

      <SaveBar dirty={editor.dirty} status={editor.status} onSave={() => editor.save('orden y visibilidad de propiedades')} />
    </>
  );
}
```

- [ ] **Step 2: `src/pages/admin/propiedades/index.astro`**

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import PropertyList from '../../../admin/components/PropertyList';
import { contentFiles } from '../../../lib/content-files';
import { propertiesSchema } from '../../../lib/schema';
import { github, rawBaseUrl } from '../../../lib/server';

export const prerender = false;

const file = await github().readJson(contentFiles.properties.path);
const properties = propertiesSchema.parse(file.data);
---

<AdminLayout title="Propiedades" active="propiedades">
  <PropertyList client:load initial={properties} sha={file.sha} rawBase={rawBaseUrl()} />
</AdminLayout>
```

- [ ] **Step 3: Verificar en navegador**

`astro dev` (ya corriendo). Abrir `/admin/propiedades` con sesión: se ven 4 propiedades con portada (terreno sin foto), ↑↓ funcionan, Guardar se habilita al mover y se deshabilita al regresar al orden original. Guardar un cambio de orden y comprobar en GitHub que hay un commit `Panel: orden y visibilidad de propiedades` en `admin-sandbox` con autor "Prueba". Regresar el orden y guardar.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/propiedades/index.astro src/admin/components/PropertyList.tsx
git commit -m "feat(admin): property list with ordering and visibility"
```

---

### Task 11: Editor de propiedad y galería

**Files:**
- Create: `src/admin/components/Gallery.tsx`, `src/admin/components/PropertyEditor.tsx`, `src/admin/property.ts`, `src/admin/property.test.ts`, `src/pages/admin/propiedades/[slug].astro`, `src/pages/admin/propiedades/nueva.astro`

**Interfaces:**
- Consumes: todo lo de la Task 8, `photoUrl`, `Property`, `Project`, `uploadPhoto`, `preparePhoto`, `newPhotoName`, `slugify`, `changedLabels`, `summarize`.
- Produces:
  - `property.ts`: `blankProperty(template?: Property): Property`; `type PendingPhoto = { state: 'processing' } | { state: 'ready'; fullSha: string; smallSha: string; preview: string }`; `photoChanges(p: Property, pending: Record<string, PendingPhoto>, removed: string[], protectedUrls: Set<string>)` → `{ add: { path: string; blobSha: string }[]; remove: string[] }`; `PROPERTY_LABELS`
  - `Gallery` props: `{ dir; photos: string[]; pending: Record<string, PendingPhoto>; rawBase; onChange(photos: string[]); onRemove(name); onFiles(files: File[]) }`

- [ ] **Step 1: Tests que fallan de `property.ts`**

`src/admin/property.test.ts`:

```ts
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
```

Run: `npx vitest run src/admin/property.test.ts` → FAIL.

- [ ] **Step 2: `src/admin/property.ts`**

```ts
import { photoUrl, type Property } from '../lib/schema';

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
```

Run: `npx vitest run src/admin/property.test.ts` → PASS.

- [ ] **Step 3: `src/admin/components/Gallery.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { photoUrl } from '../../lib/schema';
import { move } from '../format';
import type { PendingPhoto } from '../property';
import { ui } from '../ui';
import { Thumb } from './Thumb';

export function Gallery({ dir, photos, pending, rawBase, onChange, onRemove, onFiles }: {
  dir: string;
  photos: string[];
  pending: Record<string, PendingPhoto>;
  rawBase: string;
  onChange: (photos: string[]) => void;
  onRemove: (name: string) => void;
  onFiles: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <div>
      <label class={`${ui.btn} cursor-pointer mb-4`}>
        + Subir fotos
        <input type="file" accept="image/*" multiple class="sr-only" onChange={e => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = '';
          if (files.length) onFiles(files);
        }} />
      </label>
      <p class={`${ui.hint} mb-4`}>La primera foto es la portada. Arrastra para ordenar (o usa las flechas).</p>

      {photos.length === 0 ? (
        <p class="text-sm text-gray-600">Sin fotos: el sitio muestra “Fotos próximamente”.</p>
      ) : (
        <ul class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((name, i) => {
            const item = pending[name];
            return (
              <li
                key={name}
                draggable
                onDragStart={() => setDragging(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragging !== null) onChange(move(photos, dragging, i));
                  setDragging(null);
                }}
                class={`relative rounded-lg overflow-hidden border ${i === 0 ? 'border-accent ring-2 ring-accent/50' : 'border-sand/60'} bg-white`}
              >
                {item?.state === 'processing' ? (
                  <div class="aspect-[4/3] flex items-center justify-center text-xs text-gray-600 bg-bone-2">Procesando…</div>
                ) : (
                  <Thumb src={item?.state === 'ready' ? item.preview : photoUrl(dir, name, true)} rawBase={rawBase} alt={`Foto ${i + 1}`} class="aspect-[4/3] w-full" />
                )}
                {i === 0 && <span class={`${ui.badge} absolute top-2 left-2 bg-dark text-white`}>Portada</span>}
                <div class="flex items-center justify-between gap-1 p-1.5">
                  <div class="flex gap-1">
                    <button type="button" class={ui.iconBtn} disabled={i === 0} onClick={() => onChange(move(photos, i, i - 1))} aria-label={`Mover foto ${i + 1} antes`}>←</button>
                    <button type="button" class={ui.iconBtn} disabled={i === photos.length - 1} onClick={() => onChange(move(photos, i, i + 1))} aria-label={`Mover foto ${i + 1} después`}>→</button>
                  </div>
                  {i !== 0 && (
                    <button type="button" class="text-xs underline px-1" onClick={() => onChange(move(photos, i, 0))}>Portada</button>
                  )}
                  <button type="button" class={ui.iconBtn} onClick={() => onRemove(name)} aria-label={`Borrar foto ${i + 1}`}>✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/admin/components/PropertyEditor.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { photoUrl, type Project, type Property } from '../../lib/schema';
import { uploadPhoto } from '../api';
import { changedLabels, errorFor, newPhotoName, slugify, summarize } from '../format';
import { preparePhoto } from '../image';
import { blankProperty, photoChanges, PROPERTY_LABELS, type PendingPhoto } from '../property';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { Checkbox, NumberInput, Select, TextArea, TextInput } from './fields';
import { Gallery } from './Gallery';
import { PairList, RowActions, StringList } from './lists';
import { SaveBar } from './SaveBar';

type Props = { properties: Property[]; sha: string; slug: string | null; projects: Project[]; rawBase: string };

export default function PropertyEditor({ properties, sha, slug, projects, rawBase }: Props) {
  const isNew = slug === null;
  const [index] = useState(() => (isNew ? properties.length : properties.findIndex(p => p.slug === slug)));
  const initial = isNew ? [...properties, blankProperty(properties.find(p => p.kind === 'casa'))] : properties;
  const editor = useEditor('properties', initial, sha, properties);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, setPending] = useState<Record<string, PendingPhoto>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const p = editor.value[index];
  if (!p) return <p>No se encontró la propiedad. <a class="underline" href="/admin/propiedades">Volver a la lista</a></p>;

  const err = (path: string) => errorFor(editor.errors, `${index}.${path}`);
  const update = (patch: Partial<Property>) => editor.setValue(list => list.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const opt = (v: string) => (v.trim() ? v : undefined);
  const isHouse = p.kind === 'casa';
  const dir = isNew ? `/img/propiedades/${p.slug || 'nueva'}` : p.photoDir;
  const protectedUrls = new Set(projects.map(project => project.image));
  const busy = Object.values(pending).some(item => item.state === 'processing');

  async function addFiles(files: File[]) {
    setUploadErrors([]);
    for (const file of files) {
      const name = newPhotoName();
      setPending(current => ({ ...current, [name]: { state: 'processing' } }));
      editor.setValue(list => list.map((x, i) => (i === index ? { ...x, photos: [...x.photos, name] } : x)));
      try {
        const { full, small } = await preparePhoto(file);
        const [fullSha, smallSha] = await Promise.all([uploadPhoto(full), uploadPhoto(small)]);
        setPending(current => ({ ...current, [name]: { state: 'ready', fullSha, smallSha, preview: URL.createObjectURL(small) } }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir la foto.';
        setUploadErrors(current => [...current, `${file.name}: ${message}`]);
        setPending(current => {
          const { [name]: _, ...rest } = current;
          return rest;
        });
        editor.setValue(list => list.map((x, i) => (i === index ? { ...x, photos: x.photos.filter(n => n !== name) } : x)));
      }
    }
  }

  function removePhoto(name: string) {
    update({ photos: p.photos.filter(n => n !== name) });
    if (pending[name]) {
      setPending(({ [name]: _, ...rest }) => rest);
    } else {
      setRemoved(current => [...current, name]);
    }
  }

  async function save() {
    const finalProperty = isNew ? { ...p, photoDir: `/img/propiedades/${p.slug}` } : p;
    const list = editor.value.map((x, i) => (i === index ? finalProperty : x));
    const photos = photoChanges(finalProperty, pending, removed, protectedUrls);
    const before = editor.saved[index];
    const changes = before ? changedLabels(before, finalProperty, PROPERTY_LABELS) : [];
    const added = photos.add.length / 2;
    const deleted = photos.remove.length / 2;
    if (added) changes.push(`${added} foto${added > 1 ? 's' : ''} nueva${added > 1 ? 's' : ''}`);
    if (deleted) changes.push(`${deleted} foto${deleted > 1 ? 's' : ''} borrada${deleted > 1 ? 's' : ''}`);
    if (before && JSON.stringify(before.photos) !== JSON.stringify(finalProperty.photos) && !added && !deleted) changes.push('orden de fotos');
    const summary = isNew ? `Nueva propiedad: ${p.name}` : summarize(p.name, changes);
    if (await editor.save(summary, photos, list)) {
      setPending({});
      setRemoved([]);
      if (isNew) location.replace(`/admin/propiedades/${finalProperty.slug}`);
    }
  }

  async function remove() {
    const linked = projects.filter(project => project.property === p.slug).map(project => project.name);
    const warning = linked.length ? `\n\nEl proyecto ${linked.join(', ')} dejará de enlazar a esta ficha.` : '';
    if (!confirm(`¿Borrar «${p.name}»? También se borran sus fotos.${warning}`)) return;
    const list = editor.value.filter((_, i) => i !== index);
    const photos = photoChanges({ ...p, photos: [] }, {}, p.photos.filter(n => !pending[n]), protectedUrls);
    if (await editor.save(`Borra propiedad: ${p.name}`, { add: [], remove: photos.remove }, list)) {
      location.replace('/admin/propiedades');
    }
  }

  return (
    <>
      <a href="/admin/propiedades" class="text-sm underline">← Propiedades</a>
      <h1 class={`${ui.h1} mt-3`}>{isNew ? 'Nueva propiedad' : p.name}</h1>
      {!isNew && !p.hidden && <a href={`/propiedades/${p.slug}`} target="_blank" rel="noopener" class="text-sm underline">Ver en el sitio ↗</a>}

      {editor.restored && (
        <p class={`${ui.notice} bg-amber-50 border-amber-200 mt-4`}>Recuperamos los cambios que no alcanzaste a guardar. Revísalos y guarda.</p>
      )}
      <p class={`${ui.notice} bg-bone-2 border-sand/60 mt-4 mb-6`}>
        Todo lo que escribas aquí es público. No pongas precio mínimo, gravámenes ni notas internas.
      </p>

      <div class="space-y-6">
        <section class={ui.card}>
          <h2 class={ui.h2}>Datos generales</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <TextInput label="Nombre" value={p.name} error={err('name')} onInput={name => update(isNew && !slugTouched ? { name, slug: slugify(name) } : { name })} />
            </div>
            {isNew ? (
              <TextInput label="Dirección web" value={p.slug} error={err('slug')} hint={`Quedará en /propiedades/${p.slug || '…'} y no se puede cambiar después.`} onInput={value => { setSlugTouched(true); update({ slug: slugify(value) }); }} />
            ) : (
              <p class="text-sm text-gray-600 self-end">Dirección web: /propiedades/{p.slug}</p>
            )}
            <Select label="Estatus" value={p.status} onChange={status => update({ status })} options={[
              { value: 'disponible', label: 'En venta' },
              { value: 'apartado', label: 'Apartada' },
              { value: 'vendido', label: 'Vendida' },
            ]} />
            <Select label="Tipo" value={p.kind} onChange={kind => update({ kind })} options={[
              { value: 'casa', label: 'Casa' },
              { value: 'terreno', label: 'Terreno' },
            ]} />
            <TextInput label="Precio" value={p.price} error={err('price')} hint="Tal como se mostrará, p. ej. $2,390,000 MXN" onInput={price => update({ price })} />
            <TextInput label="Ubicación" value={p.location} error={err('location')} hint="Colonia o fraccionamiento y ciudad" onInput={location => update({ location })} />
            <TextInput label="Dirección (opcional)" value={p.address} error={err('address')} hint="Déjala vacía en casas vendidas" onInput={v => update({ address: opt(v) })} />
            <div class="sm:col-span-2">
              <TextInput label="Liga del mapa (opcional)" type="url" value={p.mapUrl} error={err('mapUrl')} placeholder="https://maps.app.goo.gl/…" onInput={v => update({ mapUrl: opt(v) })} />
            </div>
            <div class="sm:col-span-2">
              <TextArea label="Descripción corta" value={p.summary} error={err('summary')} hint="Una o dos frases; aparece en la tarjeta y en la ficha." onInput={summary => update({ summary })} />
            </div>
            <div class="sm:col-span-2">
              <Checkbox label="Ocultar del sitio" hint="Se guarda pero no se publica." checked={Boolean(p.hidden)} onChange={hidden => update({ hidden: hidden || undefined })} />
            </div>
          </div>
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Superficies y espacios</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumberInput label="Terreno (m²)" value={p.landArea} error={err('landArea')} onChange={v => update({ landArea: v as number })} />
            {isHouse && <NumberInput label="Construcción (m²)" value={p.builtArea} error={err('builtArea')} onChange={builtArea => update({ builtArea })} />}
            <TextInput label="Frente" value={p.frontage} error={err('frontage')} placeholder="7 m" onInput={v => update({ frontage: opt(v) })} />
            <TextInput label="Fondo" value={p.depth} error={err('depth')} placeholder="17.15 m" onInput={v => update({ depth: opt(v) })} />
            {isHouse && (
              <>
                <NumberInput label="Plantas" value={p.floors} error={err('floors')} onChange={floors => update({ floors })} />
                <NumberInput label="Recámaras" value={p.beds} error={err('beds')} onChange={beds => update({ beds })} />
                <NumberInput label="Baños" value={p.baths} error={err('baths')} hint="Medio baño = .5 (2.5)" onChange={baths => update({ baths })} />
                <NumberInput label="Cochera (autos)" value={p.parking} error={err('parking')} onChange={parking => update({ parking })} />
              </>
            )}
          </div>
        </section>

        {isHouse && (
          <section class={ui.card}>
            <h2 class={ui.h2}>Distribución</h2>
            <div class="space-y-5">
              {p.distribution.map((floor, i) => (
                <div class="border border-sand/60 rounded-lg p-4">
                  <div class="flex gap-2 items-end mb-3">
                    <div class="flex-1">
                      <TextInput label="Planta o grupo" value={floor.floor} error={err(`distribution.${i}.floor`)} placeholder="Planta baja" onInput={name => update({ distribution: p.distribution.map((f, j) => (j === i ? { ...f, floor: name } : f)) })} />
                    </div>
                    <RowActions index={i} count={p.distribution.length} label={floor.floor || 'planta'}
                      onMove={to => update({ distribution: p.distribution.map((_, j, all) => (j === i ? all[to] : j === to ? all[i] : all[j])) })}
                      onRemove={() => update({ distribution: p.distribution.filter((_, j) => j !== i) })} />
                  </div>
                  <StringList label="Espacios" items={floor.rooms} addLabel="Agregar espacio" placeholder="Sala"
                    errorAt={k => err(`distribution.${i}.rooms.${k}`)}
                    onChange={rooms => update({ distribution: p.distribution.map((f, j) => (j === i ? { ...f, rooms } : f)) })} />
                </div>
              ))}
            </div>
            <button type="button" class={`${ui.btnGhost} mt-4`} onClick={() => update({ distribution: [...p.distribution, { floor: '', rooms: [] }] })}>+ Agregar planta</button>
          </section>
        )}

        <section class={ui.card}>
          <h2 class={ui.h2}>{isHouse ? 'Por qué esta casa' : 'Lo más importante'}</h2>
          <StringList label="Diferenciadores" items={p.highlights} addLabel="Agregar" placeholder="Construcción 100% de ladrillo rojo" errorAt={k => err(`highlights.${k}`)} onChange={highlights => update({ highlights })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>{isHouse ? 'Acabados y equipamiento' : 'Características'}</h2>
          <PairList label="Renglones" items={p.finishes} addLabel="Agregar renglón" labelPlaceholder="Pisos" valuePlaceholder="Porcelanato de 60 × 60" errorAt={k => err(`finishes.${k}`)} onChange={finishes => update({ finishes })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Condiciones de venta</h2>
          <PairList label="Renglones" items={p.terms} addLabel="Agregar condición" labelPlaceholder="Crédito" valuePlaceholder="Se acepta todo tipo de crédito" errorAt={k => err(`terms.${k}`)} onChange={terms => update({ terms })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Fotos</h2>
          {uploadErrors.length > 0 && (
            <ul class={`${ui.notice} bg-red-50 border-red-200 text-red-800 mb-4 space-y-1`}>
              {uploadErrors.map(message => <li>{message}</li>)}
            </ul>
          )}
          {isNew && !p.slug ? (
            <p class="text-sm text-gray-600">Escribe el nombre para poder subir fotos.</p>
          ) : (
            <Gallery dir={dir} photos={p.photos} pending={pending} rawBase={rawBase} onChange={photos => update({ photos })} onRemove={removePhoto} onFiles={addFiles} />
          )}
        </section>

        {!isNew && (
          <section class={`${ui.card} border-red-200`}>
            <h2 class={ui.h2}>Borrar propiedad</h2>
            <p class="text-sm text-gray-600 mb-3">Si solo quieres quitarla del sitio por un tiempo, usa “Ocultar del sitio”.</p>
            <button type="button" class={ui.btnDanger} onClick={remove}>Borrar «{p.name}»</button>
          </section>
        )}
      </div>

      <SaveBar dirty={editor.dirty} status={editor.status} onSave={save} blocked={busy ? 'Espera a que terminen de subir las fotos…' : undefined} label={isNew ? 'Crear propiedad' : 'Guardar cambios'} />
    </>
  );
}

```

- [ ] **Step 5: Páginas**

`src/pages/admin/propiedades/[slug].astro`:

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import PropertyEditor from '../../../admin/components/PropertyEditor';
import { contentFiles } from '../../../lib/content-files';
import { projectsSchema, propertiesSchema } from '../../../lib/schema';
import { github, rawBaseUrl } from '../../../lib/server';

export const prerender = false;

const gh = github();
const [file, projectsFile] = await Promise.all([gh.readJson(contentFiles.properties.path), gh.readJson(contentFiles.projects.path)]);
const properties = propertiesSchema.parse(file.data);
const property = properties.find(p => p.slug === Astro.params.slug);
if (!property) return Astro.redirect('/admin/propiedades');
---

<AdminLayout title={property.name} active="propiedades">
  <PropertyEditor client:load properties={properties} sha={file.sha} slug={property.slug} projects={projectsSchema.parse(projectsFile.data)} rawBase={rawBaseUrl()} />
</AdminLayout>
```

`src/pages/admin/propiedades/nueva.astro`:

```astro
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import PropertyEditor from '../../../admin/components/PropertyEditor';
import { contentFiles } from '../../../lib/content-files';
import { projectsSchema, propertiesSchema } from '../../../lib/schema';
import { github, rawBaseUrl } from '../../../lib/server';

export const prerender = false;

const gh = github();
const [file, projectsFile] = await Promise.all([gh.readJson(contentFiles.properties.path), gh.readJson(contentFiles.projects.path)]);
---

<AdminLayout title="Nueva propiedad" active="propiedades">
  <PropertyEditor client:load properties={propertiesSchema.parse(file.data)} sha={file.sha} slug={null} projects={projectsSchema.parse(projectsFile.data)} rawBase={rawBaseUrl()} />
</AdminLayout>
```

- [ ] **Step 6: Verificar**

Run: `npx vitest run && npx astro check 2>&1 | tail -3` → PASS y sin errores. La prueba en navegador se cubre en el E2E (Task 14).

- [ ] **Step 7: Commit**

```bash
git add src/admin/property.ts src/admin/property.test.ts src/admin/components/Gallery.tsx src/admin/components/PropertyEditor.tsx src/pages/admin/propiedades
git commit -m "feat(admin): property editor with photo gallery"
```

---

### Task 12: Editor de proyectos

**Files:**
- Create: `src/admin/components/ProjectsEditor.tsx`, `src/pages/admin/proyectos.astro`

**Interfaces:**
- Consumes: `useEditor`, campos, `RowActions`, `SaveBar`, `Thumb`, `preparePhoto`, `uploadPhoto`, `newPhotoName`, `slugify`, `photoUrl`, `Project`, `Property`.

- [ ] **Step 1: `ProjectsEditor.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { photoUrl, type Project, type Property } from '../../lib/schema';
import { uploadPhoto } from '../api';
import { errorFor, move, newPhotoName, slugify } from '../format';
import { preparePhoto } from '../image';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { Select, TextInput } from './fields';
import { RowActions } from './lists';
import { SaveBar } from './SaveBar';
import { Thumb } from './Thumb';

type Upload = { fullSha: string; smallSha: string; preview: string };
const fullFromSmall = (small: string) => small.replace(/-sm\.jpg$/, '.jpg');

export default function ProjectsEditor({ initial, sha, properties, rawBase }: { initial: Project[]; sha: string; properties: Property[]; rawBase: string }) {
  const editor = useEditor('projects', initial, sha);
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [newSlugs, setNewSlugs] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const list = editor.value;
  const update = (i: number, patch: Partial<Project>) => editor.setValue(all => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function upload(i: number, file: File) {
    const project = list[i];
    setBusy(i);
    setMessage('');
    try {
      const { full, small } = await preparePhoto(file);
      const [fullSha, smallSha] = await Promise.all([uploadPhoto(full), uploadPhoto(small)]);
      const image = photoUrl(`/img/proyectos/${project.slug}`, newPhotoName(), true);
      setUploads(current => ({ ...current, [image]: { fullSha, smallSha, preview: URL.createObjectURL(small) } }));
      update(i, { image });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo subir la foto.');
    } finally {
      setBusy(null);
    }
  }

  function save() {
    const used = new Set(list.map(p => p.image));
    const add = [...used].filter(image => uploads[image]).flatMap(image => [
      { path: `public${fullFromSmall(image)}`, blobSha: uploads[image].fullSha },
      { path: `public${image}`, blobSha: uploads[image].smallSha },
    ]);
    // Solo se borran fotos propias de proyectos (las de propiedades viven con su ficha).
    const remove = editor.saved
      .map(p => p.image)
      .filter(image => image.startsWith('/img/proyectos/') && !used.has(image))
      .flatMap(image => [`public${fullFromSmall(image)}`, `public${image}`]);
    editor.save('proyectos realizados', { add, remove }).then(ok => ok && setUploads({}));
  }

  return (
    <>
      <h1 class={ui.h1}>Proyectos realizados</h1>
      <p class="text-sm text-gray-600 mb-6">Obras que aparecen en “Proyectos”. Si la casa sigue a la venta, lígala a su ficha para mostrar “En venta →”.</p>
      {message && <p class={`${ui.notice} bg-red-50 border-red-200 text-red-800 mb-4`}>{message}</p>}

      <div class="space-y-4">
        {list.map((project, i) => {
          const err = (path: string) => errorFor(editor.errors, `${i}.${path}`);
          const linked = properties.find(p => p.slug === project.property);
          const preview = uploads[project.image]?.preview ?? project.image;
          return (
            <section class={ui.card}>
              <div class="flex gap-4 items-start">
                <Thumb src={preview} rawBase={rawBase} alt="" class="h-24 w-32 rounded-md shrink-0" />
                <div class="flex-1 grid sm:grid-cols-2 gap-3">
                  <TextInput label="Nombre" value={project.name} error={err('name') ?? err('slug')} onInput={name => update(i, newSlugs.has(i) ? { name, slug: slugify(name) } : { name })} />
                  <TextInput label="Ubicación" value={project.location} error={err('location')} onInput={location => update(i, { location })} />
                  <Select label="Categoría" value={project.category} onChange={category => update(i, { category })} options={[
                    { value: 'residencial', label: 'Residencial' },
                    { value: 'comercial', label: 'Comercial' },
                    { value: 'remodelacion', label: 'Remodelación' },
                  ]} />
                  <Select label="Ficha a la venta" value={project.property ?? ''} onChange={v => update(i, { property: v || undefined })} options={[
                    { value: '', label: 'Ninguna' },
                    ...properties.map(p => ({ value: p.slug, label: p.name })),
                  ]} />
                  <div class="sm:col-span-2 flex flex-wrap gap-2 items-center">
                    <label class={`${ui.btnGhost} cursor-pointer ${!project.slug || busy !== null ? 'opacity-40 pointer-events-none' : ''}`}>
                      {busy === i ? 'Subiendo…' : 'Subir foto'}
                      <input type="file" accept="image/*" class="sr-only" onChange={e => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = '';
                        if (file) upload(i, file);
                      }} />
                    </label>
                    {linked?.photos[0] && (
                      <button type="button" class={ui.btnGhost} onClick={() => update(i, { image: photoUrl(linked.photoDir, linked.photos[0], true) })}>
                        Usar portada de la ficha
                      </button>
                    )}
                    {err('image') && <span class={ui.error}>{err('image')}</span>}
                  </div>
                </div>
                <RowActions index={i} count={list.length} label={project.name || 'proyecto'}
                  onMove={to => editor.setValue(move(list, i, to))}
                  onRemove={() => confirm(`¿Quitar «${project.name || 'este proyecto'}»?`) && editor.setValue(list.filter((_, j) => j !== i))} />
              </div>
            </section>
          );
        })}
      </div>

      <button type="button" class={`${ui.btnGhost} mt-4`} onClick={() => {
        setNewSlugs(current => new Set(current).add(list.length));
        editor.setValue([...list, { slug: '', name: '', category: 'residencial', location: '', image: '' }]);
      }}>+ Agregar proyecto</button>

      <SaveBar dirty={editor.dirty} status={editor.status} onSave={save} blocked={busy !== null ? 'Espera a que termine de subir la foto…' : undefined} />
    </>
  );
}
```

- [ ] **Step 2: `src/pages/admin/proyectos.astro`**

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import ProjectsEditor from '../../admin/components/ProjectsEditor';
import { contentFiles } from '../../lib/content-files';
import { projectsSchema, propertiesSchema } from '../../lib/schema';
import { github, rawBaseUrl } from '../../lib/server';

export const prerender = false;

const gh = github();
const [file, propertiesFile] = await Promise.all([gh.readJson(contentFiles.projects.path), gh.readJson(contentFiles.properties.path)]);
---

<AdminLayout title="Proyectos" active="proyectos">
  <ProjectsEditor client:load initial={projectsSchema.parse(file.data)} sha={file.sha} properties={propertiesSchema.parse(propertiesFile.data)} rawBase={rawBaseUrl()} />
</AdminLayout>
```

- [ ] **Step 3: Verificar y commit**

Run: `npx astro check 2>&1 | tail -3` → sin errores.

```bash
git add src/admin/components/ProjectsEditor.tsx src/pages/admin/proyectos.astro
git commit -m "feat(admin): projects editor"
```

---

### Task 13: Contacto y servicios

**Files:**
- Create: `src/admin/components/SettingsEditor.tsx`, `src/admin/components/ServicesEditor.tsx`, `src/pages/admin/contacto.astro`, `src/pages/admin/servicios.astro`

**Interfaces:**
- Consumes: `useEditor`, campos, `StringList`, `SaveBar`, `changedLabels`, `summarize`, `Settings`, `Service`.

- [ ] **Step 1: `SettingsEditor.tsx`**

```tsx
import type { Settings } from '../../lib/schema';
import { changedLabels, errorFor, summarize } from '../format';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { NumberInput, PhoneInput, TextInput } from './fields';
import { SaveBar } from './SaveBar';

const CONTACT_LABELS = { phoneDigits: 'teléfono', visitsWhatsapp: 'WhatsApp de visitas', street: 'calle', colonia: 'colonia', city: 'ciudad', coverage: 'cobertura', hours: 'horario' };
const BRAND_LABELS = { name: 'nombre', slogan: 'eslogan', yearsOfExperience: 'años de experiencia' };

export default function SettingsEditor({ initial, sha }: { initial: Settings; sha: string }) {
  const editor = useEditor('settings', initial, sha);
  const s = editor.value;
  const err = (path: string) => errorFor(editor.errors, path);
  const contact = (patch: Partial<Settings['contact']>) => editor.setValue(v => ({ ...v, contact: { ...v.contact, ...patch } }));
  const brand = (patch: Partial<Settings['brand']>) => editor.setValue(v => ({ ...v, brand: { ...v.brand, ...patch } }));

  const save = () => {
    const changes = [
      ...changedLabels(editor.saved.contact, s.contact, CONTACT_LABELS),
      ...changedLabels(editor.saved.brand, s.brand, BRAND_LABELS),
    ];
    editor.save(summarize('Contacto', changes));
  };

  return (
    <>
      <h1 class={ui.h1}>Contacto</h1>
      <p class="text-sm text-gray-600 mb-6">Aparece en el encabezado, el pie de página y la página de contacto.</p>
      <div class="space-y-6">
        <section class={ui.card}>
          <h2 class={ui.h2}>Teléfonos</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <PhoneInput label="Teléfono y WhatsApp general" value={s.contact.phoneDigits} error={err('contact.phoneDigits')} hint="Mientras esté vacío, el sitio oculta los botones de llamar y WhatsApp." onChange={phoneDigits => contact({ phoneDigits })} />
            <PhoneInput label="WhatsApp para agendar visitas" value={s.contact.visitsWhatsapp} error={err('contact.visitsWhatsapp')} hint="Lo usa el botón “Agendar visita” de cada propiedad." onChange={visitsWhatsapp => contact({ visitsWhatsapp })} />
          </div>
        </section>
        <section class={ui.card}>
          <h2 class={ui.h2}>Oficina</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <TextInput label="Calle y número" value={s.contact.street} error={err('contact.street')} onInput={street => contact({ street })} />
            <TextInput label="Colonia" value={s.contact.colonia} error={err('contact.colonia')} onInput={colonia => contact({ colonia })} />
            <TextInput label="Ciudad" value={s.contact.city} error={err('contact.city')} onInput={city => contact({ city })} />
            <TextInput label="Horario" value={s.contact.hours} error={err('contact.hours')} onInput={hours => contact({ hours })} />
            <div class="sm:col-span-2">
              <TextInput label="Cobertura" value={s.contact.coverage} error={err('contact.coverage')} hint="Se lee “… en {cobertura}”, p. ej. “Chihuahua y todo el estado”." onInput={coverage => contact({ coverage })} />
            </div>
          </div>
        </section>
        <section class={ui.card}>
          <h2 class={ui.h2}>Empresa</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <TextInput label="Nombre" value={s.brand.name} error={err('brand.name')} onInput={name => brand({ name })} />
            <NumberInput label="Años de experiencia" value={s.brand.yearsOfExperience} error={err('brand.yearsOfExperience')} onChange={v => brand({ yearsOfExperience: v as number })} />
            <div class="sm:col-span-2">
              <TextInput label="Eslogan" value={s.brand.slogan} error={err('brand.slogan')} onInput={slogan => brand({ slogan })} />
            </div>
          </div>
        </section>
      </div>
      <SaveBar dirty={editor.dirty} status={editor.status} onSave={save} />
    </>
  );
}
```

- [ ] **Step 2: `ServicesEditor.tsx`**

```tsx
import type { Service } from '../../lib/schema';
import { errorFor } from '../format';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { TextArea, TextInput } from './fields';
import { StringList } from './lists';
import { SaveBar } from './SaveBar';

export default function ServicesEditor({ initial, sha }: { initial: Service[]; sha: string }) {
  const editor = useEditor('services', initial, sha);
  const update = (i: number, patch: Partial<Service>) => editor.setValue(list => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <>
      <h1 class={ui.h1}>Servicios</h1>
      <p class="text-sm text-gray-600 mb-6">Los cuatro servicios principales. Las fotos y el catálogo completo los cambia el desarrollador.</p>
      <div class="space-y-6">
        {editor.value.map((s, i) => {
          const err = (path: string) => errorFor(editor.errors, `${i}.${path}`);
          return (
            <section class={ui.card}>
              <h2 class={ui.h2}>{s.num} · {s.title || 'Sin título'}</h2>
              <div class="space-y-4">
                <TextInput label="Título" value={s.title} error={err('title')} onInput={title => update(i, { title })} />
                <TextInput label="Texto corto" value={s.short} error={err('short')} hint="Tarjetas de inicio y pie de página." onInput={short => update(i, { short })} />
                <TextArea label="Resumen" value={s.summary} error={err('summary')} hint="Página de servicios." onInput={summary => update(i, { summary })} />
                <StringList label="Puntos" items={s.points} addLabel="Agregar punto" errorAt={k => err(`points.${k}`) ?? (k === 0 ? err('points') : undefined)} onChange={points => update(i, { points })} />
              </div>
            </section>
          );
        })}
      </div>
      <SaveBar dirty={editor.dirty} status={editor.status} onSave={() => editor.save('textos de servicios')} />
    </>
  );
}
```

- [ ] **Step 3: Páginas**

`src/pages/admin/contacto.astro`:

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import SettingsEditor from '../../admin/components/SettingsEditor';
import { contentFiles } from '../../lib/content-files';
import { settingsSchema } from '../../lib/schema';
import { github } from '../../lib/server';

export const prerender = false;

const file = await github().readJson(contentFiles.settings.path);
---

<AdminLayout title="Contacto" active="contacto">
  <SettingsEditor client:load initial={settingsSchema.parse(file.data)} sha={file.sha} />
</AdminLayout>
```

`src/pages/admin/servicios.astro`:

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import ServicesEditor from '../../admin/components/ServicesEditor';
import { contentFiles } from '../../lib/content-files';
import { servicesSchema } from '../../lib/schema';
import { github } from '../../lib/server';

export const prerender = false;

const file = await github().readJson(contentFiles.services.path);
---

<AdminLayout title="Servicios" active="servicios">
  <ServicesEditor client:load initial={servicesSchema.parse(file.data)} sha={file.sha} />
</AdminLayout>
```

- [ ] **Step 4: Verificar y commit**

Run: `npx vitest run && npx astro check 2>&1 | tail -3 && npx astro build 2>&1 | tail -3` → todo OK.

```bash
git add src/admin/components/SettingsEditor.tsx src/admin/components/ServicesEditor.tsx src/pages/admin/contacto.astro src/pages/admin/servicios.astro
git commit -m "feat(admin): contact and services editors"
```

---

### Task 14: E2E, documentación y entrega

**Files:**
- Create: `tests/e2e/admin.e2e.mjs`, `tests/e2e/fixture.jpg` (copia de una foto -sm existente)
- Modify: `README.md` (reemplazar el del starter), `package.json` (devDependency `puppeteer-core`, script `test:e2e`), `docs/superpowers/specs/2026-11-24-panel-admin-design.md` (desviaciones)

- [ ] **Step 1: E2E con puppeteer-core**

```bash
npm i -D puppeteer-core@^24
cp public/img/propiedades/cittanova-1/01-sm.jpg tests/e2e/fixture.jpg
```

`tests/e2e/admin.e2e.mjs`:

```js
// E2E del panel contra el dev server local, escribiendo en admin-sandbox.
// Uso: E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { E2E_EMAIL, E2E_PASSWORD } = process.env;
assert.ok(E2E_EMAIL && E2E_PASSWORD, 'Define E2E_EMAIL y E2E_PASSWORD');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
page.on('dialog', dialog => dialog.accept());
const step = name => console.log(`• ${name}`);
const waitForStatus = text => page.waitForFunction(t => document.querySelector('[role=status]')?.textContent?.includes(t), { timeout: 60000 }, text);

try {
  step('redirige a login sin sesión');
  await page.goto(`${BASE}/admin/propiedades`);
  assert.match(page.url(), /\/admin\/login\?next=/);

  step('rechaza contraseña incorrecta');
  await page.type('input[name=email]', E2E_EMAIL);
  await page.type('input[name=password]', 'incorrecta');
  await page.click('button[type=submit]');
  await page.waitForSelector('#login-error:not(.hidden)');

  step('entra y vuelve a la página pedida');
  await page.$eval('input[name=password]', el => (el.value = ''));
  await page.type('input[name=password]', E2E_PASSWORD);
  await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  assert.match(page.url(), /\/admin\/propiedades$/);

  step('crea una propiedad oculta con una foto');
  await page.goto(`${BASE}/admin/propiedades/nueva`);
  const name = `Prueba E2E ${Date.now()}`;
  await page.$$eval('label', labels => labels.forEach(l => l.dataset.label = l.querySelector('span')?.textContent ?? ''));
  const fill = async (label, value) => {
    const input = await page.$(`label[data-label="${label}"] input, label[data-label="${label}"] textarea`);
    await input.click({ clickCount: 3 });
    await input.type(value);
  };
  await fill('Nombre', name);
  await fill('Precio', '$1 MXN');
  await fill('Ubicación', 'Chihuahua');
  await fill('Descripción corta', 'Propiedad de prueba automática.');
  await fill('Terreno (m²)', '100');
  await page.click('label[data-label="Ocultar del sitio"] input');
  const [chooser] = await Promise.all([page.waitForFileChooser(), page.click('label:has(input[type=file])')]);
  await chooser.accept([fileURLToPath(new URL('./fixture.jpg', import.meta.url))]);
  await page.waitForFunction(() => !document.body.textContent.includes('Procesando…'), { timeout: 60000 });
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.click('div.fixed button')]);
  assert.match(page.url(), /\/admin\/propiedades\/prueba-e2e-/);

  step('muestra error por campo al vaciar el precio');
  await page.$$eval('label', labels => labels.forEach(l => l.dataset.label = l.querySelector('span')?.textContent ?? ''));
  await fill('Precio', ' ');
  await page.$eval('label[data-label="Precio"] input', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('div.fixed button');
  await page.waitForFunction(() => document.body.textContent.includes('Este campo es obligatorio'));

  step('detecta conflicto con dos pestañas');
  const other = await browser.newPage();
  await other.goto(page.url());
  await other.$$eval('label', labels => labels.forEach(l => l.dataset.label = l.querySelector('span')?.textContent ?? ''));
  const otherPrice = await other.$('label[data-label="Precio"] input');
  await otherPrice.click({ clickCount: 3 });
  await otherPrice.type('$2 MXN');
  await other.click('div.fixed button');
  await other.waitForFunction(() => document.querySelector('[role=status]')?.textContent?.includes('Guardado'), { timeout: 60000 });
  await fill('Precio', '$3 MXN');
  await page.click('div.fixed button');
  await waitForStatus('Alguien guardó cambios');
  await other.close();

  step('borra la propiedad de prueba');
  await page.reload();
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Borrar «'))?.click());
  await page.waitForNavigation({ timeout: 60000 });
  assert.match(page.url(), /\/admin\/propiedades$/);

  step('cierra sesión');
  await page.goto(`${BASE}/admin`);
  await page.setViewport({ width: 1280, height: 900 });
  await Promise.all([page.waitForNavigation(), page.click('#admin-logout-desktop')]);
  assert.match(page.url(), /\/admin\/login/);

  console.log('E2E OK');
} finally {
  await browser.close();
}
```

En `package.json` → `scripts`: `"test:e2e": "node tests/e2e/admin.e2e.mjs"`.

Nota: `label:has(input[type=file])` usa `:has`, que Chrome soporta. Ajustar selectores si hace falta hasta que el script pase de punta a punta; es la prueba de aceptación del panel.

Run (dev server con `.env` de la Task 7): `E2E_EMAIL=prueba@ahh.mx E2E_PASSWORD=contraseña-larga npm run test:e2e` → `E2E OK`. Revisar en GitHub (rama `admin-sandbox`) los commits `Panel: Nueva propiedad: Prueba E2E …`, el del precio y `Panel: Borra propiedad: …`, y que la foto se agregó y luego se borró.

- [ ] **Step 2: Revisión visual en móvil**

Con sesión en el navegador local, revisar `/admin`, `/admin/propiedades`, una ficha, `/admin/proyectos`, `/admin/contacto` y `/admin/servicios` a 390 px de ancho (DevTools → responsive) y a 1440 px. Nada se desborda horizontalmente y la barra de guardar no tapa el último campo (`pb-32` en `main`).

- [ ] **Step 3: README**

Reemplazar `README.md` por:

```markdown
# AHH Construcción y Remodelación — sitio web

Astro 7 + Tailwind 4, publicado en Vercel. El contenido editable (propiedades,
proyectos, contacto, servicios) vive en `src/content/*.json` y se edita desde el
panel `/admin`.

## Desarrollo

    npm install
    cp .env.example .env   # ver "Panel" abajo
    astro dev --background # http://localhost:4321
    npm test               # unitarias (vitest)
    npm run test:e2e       # E2E del panel (requiere dev server y E2E_EMAIL/E2E_PASSWORD)

## Panel /admin

Cada guardado hace un commit en GitHub (`Panel: …`) y Vercel publica en 1–2 min.
Si un build falla, Vercel deja la versión anterior en línea.

Variables (Vercel → Settings → Environment Variables, en Production y Preview):

| Variable | Valor |
|---|---|
| `ADMIN_USERS` | `[{"email","name","hash"}, …]`. Cada entrada sale de `npm run admin:user -- correo "Nombre"` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Cambiarlo cierra todas las sesiones |
| `GITHUB_TOKEN` | Token fine-grained: solo `Asaply/AHH_web_demo`; Contents read/write, Deployments read |
| `GITHUB_REPO` | `Asaply/AHH_web_demo` |
| `GITHUB_BRANCH` | `main` en Production; `admin-sandbox` en Preview y local |

- Agregar o quitar usuarios = editar `ADMIN_USERS` y redeploy. Quitarlo corta el
  acceso al momento.
- Contraseña olvidada: generar un hash nuevo con `npm run admin:user`.
- Deshacer un cambio del panel: `git revert <sha>` del commit `Panel: …` y push.
- El repo es público: el panel no guarda datos internos de las fichas.
```

- [ ] **Step 4: Actualizar el spec con las desviaciones**

En `docs/superpowers/specs/2026-11-24-panel-admin-design.md`:
- En la tabla de modelo de contenido, `settings.json` sin `socials`, más una nota: "`socials` queda en `site.ts`: ningún componente lo pinta todavía".
- En "Flujo de guardado", punto 5: el autor es el nombre del usuario con el correo `panel@ahh-construccion.invalid`, para no publicar el correo del cliente en un repo público.

- [ ] **Step 5: Verificación final y commit**

```bash
npx vitest run && npx astro check 2>&1 | tail -3 && npx astro build 2>&1 | tail -3
git add tests/e2e README.md package.json package-lock.json docs/superpowers/specs/2026-11-24-panel-admin-design.md
git commit -m "test(admin): end-to-end flow, docs and setup guide"
```

- [ ] **Step 6: Preview en Vercel (requiere confirmación del dueño)**

Pedir al dueño que, en Vercel, cargue las variables de **Preview** (`GITHUB_BRANCH=admin-sandbox`, su token fine-grained y su usuario). Luego `git push -u origin feat/admin-panel` y probar el login y un guardado en la URL de preview de esa rama.

- [ ] **Step 7: Pasar a producción (requiere confirmación del dueño)**

1. Variables de **Production** en Vercel (`GITHUB_BRANCH=main`) con el usuario del cliente.
2. Merge de `feat/admin-panel` a `main` (PR).
3. Desactivar GitHub Pages: `gh api -X DELETE repos/Asaply/AHH_web_demo/pages`, solo con el visto bueno explícito del dueño.
4. Borrar la rama `admin-sandbox` cuando ya no se use.
```

