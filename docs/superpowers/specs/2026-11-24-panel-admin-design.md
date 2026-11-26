# Panel de administrador — diseño

Fecha: 2026-11-24 · Estado: propuesto

## Objetivo

Que el cliente (AHH, usuario no técnico) mantenga el contenido del sitio sin
tocar código: precios, estatus de venta, fichas y fotos de propiedades,
proyectos realizados, datos de contacto y textos de servicios.

Criterios de éxito:

- Entra con correo y contraseña, todo en español, desde computadora o celular.
- Marcar una casa como vendida o cambiar un precio toma menos de un minuto y
  aparece en el sitio público en ~1–2 minutos.
- Sube fotos directo del celular (archivos de 5–20 MB) sin preparar nada.
- Un error del cliente no puede tumbar el sitio público.

## Decisiones tomadas

| Tema | Decisión | Por qué |
|---|---|---|
| Enfoque | Panel propio en `/admin` dentro del mismo proyecto Astro | Español, a la medida, sin cuentas nuevas para el cliente |
| Almacenamiento | Archivos JSON en el repo; el panel hace commits vía API de GitHub | Gratis, con historial y reversible; el sitio público sigue estático |
| Hosting | Solo Vercel. Se retira GitHub Pages | El login necesita servidor; Pages solo sirve estáticos |
| Login | Correo + contraseña; usuarios en variable de entorno | Sin base de datos ni servicio externo |
| UI del panel | Islas Preact solo dentro de `/admin` | Los formularios tienen listas dinámicas y galería; el sitio público no carga nada nuevo |

## Arquitectura

```
Navegador (cliente)                 Vercel                          GitHub
───────────────────                 ──────                          ──────
/admin/* (Preact)  ── fetch ──▶  rutas SSR + /admin/api/*  ── API ──▶  repo Asaply/AHH_web_demo
  · redimensiona fotos            · middleware de sesión              · commit en main
  · valida con el mismo schema    · valida con zod                         │
                                  · lee/escribe JSON y fotos               │ push
                                                                           ▼
Sitio público (estático)  ◀──────────── Vercel reconstruye y publica ◀── webhook
```

- Las páginas públicas siguen prerenderizadas (`output: 'static'`). Solo las
  rutas de `/admin` llevan `export const prerender = false` y corren como
  funciones de Vercel (`@astrojs/vercel`).
- El panel **lee siempre de GitHub**, no del bundle publicado: así ve lo último
  aunque el deploy anterior siga en curso.
- Si un build falla, Vercel no promueve el deploy y el sitio sigue con la versión
  anterior. Esa es la red de seguridad principal.

## Modelo de contenido

Los datos editables salen de `src/data/site.ts` a `src/content/`:

| Archivo | Contenido |
|---|---|
| `properties.json` | Lista ordenada de propiedades (el orden del archivo es el del sitio) |
| `projects.json` | Lista ordenada de proyectos realizados |
| `settings.json` | `brand` (nombre, eslogan, años de experiencia) y `contact` (teléfono, WhatsApp de visitas, dirección, horario, cobertura). `socials` se queda en `site.ts`: ningún componente lo pinta todavía |
| `services.json` | Los 4 servicios: título, resumen, texto corto, puntos. `slug`, `icon` e `image` no se editan |

- `src/lib/schema.ts` define los schemas zod (`astro/zod`) **compartidos** por el
  sitio y por la API del panel. Los mensajes de error van en español.
- `site.ts` importa los JSON, los valida con `schema.parse()` (un dato inválido
  rompe el build, nunca el sitio en vivo) y sigue exportando lo mismo que hoy
  (`properties`, `projects`, `contact`, `services`, `photo()`…). Las páginas no
  cambian.
- Se quedan en `site.ts` (fuera del panel): `catalog`, `values`, `process` y
  `features`.

Cambios al tipo `Property`:

- `photoCount: number` → `photos: string[]`: nombres base dentro de `photoDir`
  (`["01", "02", "m3k9x2"]`). El orden del arreglo es el de la galería y el
  primero es la portada. Las fotos actuales migran como `"01"…"NN"`.
- `photoDir` queda igual en las existentes. Las nuevas usan `/img/propiedades/<slug>`.
- Nuevo `hidden?: boolean`: oculta la propiedad del sitio sin borrarla.
- `slug` no se puede editar después de crear la propiedad: es la URL y la carpeta
  de fotos.

**Campos internos:** el repo es público, así que el schema no incluye los campos
USO INTERNO de las fichas (precio mínimo, gravamen, observaciones) y el panel no
los pide. El formulario lo dice en una nota.

## Pantallas

| Ruta | Qué hace |
|---|---|
| `/admin/login` | Correo + contraseña |
| `/admin` | Inicio: conteo de propiedades (en venta / apartadas / vendidas / ocultas), estado del último deploy, últimos 10 cambios (quién, qué, cuándo) y accesos rápidos |
| `/admin/propiedades` | Lista con portada, estatus, precio; subir/bajar en el orden; ocultar/mostrar; botón "Nueva" |
| `/admin/propiedades/nueva`, `/admin/propiedades/[slug]` | Ficha completa, en secciones: datos generales, superficies, espacios, distribución (plantas con sus espacios), diferenciadores, acabados, condiciones y galería. Botón borrar con confirmación |
| `/admin/proyectos` | Lista editable: nombre, categoría, ubicación, foto (subir una o tomar la portada de una propiedad), liga opcional a una propiedad |
| `/admin/contacto` | Teléfono, WhatsApp de visitas, dirección, horario, cobertura, años de experiencia, redes |
| `/admin/servicios` | Textos de los 4 servicios |

Comportamiento común:

- Aviso al salir con cambios sin guardar.
- Al guardar: "Guardado. El sitio se actualiza en ~1 minuto". El estado se
  consulta solo hasta que dice "Publicado" o "Falló".
- Diseño responsive: el cliente puede marcar una venta desde el celular.
- `<meta name="robots" content="noindex">` en todo `/admin`.

### Galería

- Subir varias fotos a la vez (input con `accept="image/*"`; en iPhone el
  sistema entrega JPEG).
- El navegador redimensiona a 1800 px (calidad 0.82) y 720 px (calidad 0.78)
  antes de subir, con la orientación EXIF ya aplicada. Cada foto viaja por
  separado (~300 KB), así que no choca con el límite de 4.5 MB por petición de
  Vercel.
- Arrastrar para ordenar (y flechas en móvil), marcar portada (la mueve al
  inicio) y borrar.
- Si el formato no se puede decodificar (por ejemplo HEIC en Chrome de
  escritorio): "Este formato no se puede leer. Sube la foto en JPG o PNG."

## API (`/admin/api/*`)

| Método y ruta | Uso |
|---|---|
| `POST /admin/api/login`, `POST /admin/api/logout` | Sesión |
| `GET /admin/api/content/:name` | Devuelve `{ data, sha }` del JSON desde GitHub |
| `PUT /admin/api/content/:name` | `{ data, baseSha, photos: { add: [{path, blobSha}], remove: [path] }, summary }` → valida, revisa conflicto y hace **un solo commit** |
| `POST /admin/api/photo` | Recibe un JPEG (binario), crea un blob en GitHub y devuelve `{ blobSha }` |
| `GET /admin/api/status?sha=` | Estado del deploy de ese commit (deployments de GitHub que publica Vercel). El inicio consulta el HEAD de la rama, porque Vercel solo despliega la punta |
| `GET /admin/api/history` | Últimos 10 commits que tocan `src/content/` (todo guardado del panel cambia algún JSON, incluso si solo mueve fotos) |

### Flujo de guardado

1. El cliente sube fotos nuevas: cada una pasa por `POST /photo` y queda como
   blob en GitHub (todavía sin commit, así que no dispara deploys).
2. Al dar Guardar, `PUT /content/:name` valida con zod. Si falla, responde 422
   con los errores por campo.
3. Compara `baseSha` con el sha actual del archivo en GitHub. Si cambió, responde
   409: "Alguien guardó cambios mientras editabas. Recarga para ver la versión
   actual." No hay merge automático.
4. Arma un commit atómico con la Git Data API (tree con `base_tree`: JSON nuevo,
   fotos agregadas por `blobSha` y fotos borradas con `sha: null`), luego crea el
   commit y actualiza `refs/heads/<branch>` sin force. Si el ref se movió entre
   medio, reintenta una vez sobre el nuevo HEAD.
5. Mensaje del commit en español. El autor es el nombre del usuario con el correo
   `panel@ahh-construccion.invalid`, para no publicar el correo del cliente en un
   repo público. Por ejemplo:
   `Panel: Casa Alleza Boreal — precio, estatus, 3 fotos nuevas`.

La foto que se sube a un proyecto va a `/img/proyectos/<slug>/<nombre>.jpg` y `-sm.jpg`, y `image` guarda la ruta `-sm`.

Al borrar una propiedad se borran también sus fotos en el mismo commit. Las
fotos usadas por un proyecto no se borran: el panel avisa.

## Autenticación y seguridad

- **Usuarios:** variable `ADMIN_USERS` con un arreglo JSON
  `[{ "email", "name", "hash" }]`. El hash es scrypt (`node:crypto`, sin
  dependencias) con formato `scrypt:N:r:p:salt:hash` (sin `$`, que dotenv-expand interpretaría como variable). El script
  `npm run admin:user` pide la contraseña sin mostrarla y genera la entrada.
- **Sesión:** cookie `ahh_admin` = `base64url(payload).hmac-sha256` con
  `SESSION_SECRET`; el payload es `{ email, exp }`. Dura 7 días, con atributos
  `HttpOnly`, `Secure` y `SameSite=Strict`, y path `/admin`. Para cerrar todas
  las sesiones se rota el secreto.
- **Middleware:** todo `/admin/*` menos `login` exige sesión válida y que el
  usuario siga en `ADMIN_USERS` (quitar a alguien de la lista le quita el acceso
  de inmediato). Las páginas redirigen a login; la API responde 401.
- **CSRF:** `SameSite=Strict`, y además se rechaza cualquier petición que no sea
  GET cuyo `Origin` no coincida con el host.
- **Intentos de login:** espera fija de 400 ms en cada fallo, más un límite en
  memoria por instancia (5 fallos en 15 minutos por correo+IP). En funciones
  serverless este límite es de mejor esfuerzo y queda documentado así.
- Comparaciones con `timingSafeEqual`.
- **Token de GitHub:** fine-grained, solo para el repo, con permisos Contents
  (lectura y escritura), Deployments (lectura) y Metadata (lectura). Vive solo en
  Vercel y nunca llega al navegador.
- **Contraseña olvidada:** no hay correo de recuperación. El desarrollador genera
  un hash nuevo y actualiza la variable.

Variables (`astro:env`, contexto server y acceso secret): `ADMIN_USERS`,
`SESSION_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO` y `GITHUB_BRANCH`. En desarrollo
local `GITHUB_BRANCH=admin-sandbox`, para no publicar en producción mientras se
prueba.

## Errores

| Situación | Lo que ve el cliente |
|---|---|
| Datos inválidos | Mensaje junto a cada campo y botón de guardar habilitado |
| Conflicto (409) | Aviso para recargar; sus cambios siguen en pantalla para copiarlos |
| GitHub caído o token vencido | "No se pudo guardar. Tus cambios siguen en pantalla; intenta en un momento." En el log del servidor queda el detalle |
| Deploy fallido | "La publicación falló; el sitio sigue mostrando la versión anterior. Avisa al desarrollador." |
| Sesión vencida al guardar | Lleva a login y conserva el borrador en `sessionStorage` |

## Pruebas

- **Unitarias (vitest):**
  - Schemas: aceptan los datos actuales migrados y rechazan casos malos.
  - Auth: hash/verify, firma de cookie, cookie vencida o alterada, y usuario
    eliminado.
  - Cliente de GitHub con `fetch` simulado: entradas del tree, borrados, conflicto
    409 y reintento cuando el ref se movió.
  - Nombres y rutas de fotos.
- **Migración sin cambios visibles:** se compila el sitio antes y después de mover
  los datos a JSON y se compara el HTML de las 10 páginas públicas. Deben ser
  iguales.
- **E2E manual** en la rama `admin-sandbox` con un preview de Vercel: login,
  editar precio, subir y ordenar fotos, borrar, crear y ocultar una propiedad,
  probar el conflicto con dos pestañas y ver el estado del deploy. Probar también
  desde un celular.

## Fuera de alcance (v1)

- Bandeja de mensajes del formulario: necesitaría base de datos y hoy los
  mensajes llegan por WhatsApp.
- Editar el catálogo de 20 categorías, valores, proceso, features, imágenes de
  hero o servicios, y el video.
- Roles y permisos distintos (todos los usuarios pueden todo).
- Recuperar la contraseña por correo y vista previa antes de publicar.

## Pasos que requieren al dueño del repo

1. Crear el token fine-grained de GitHub con los permisos de arriba.
2. Definir el correo y la contraseña del cliente (se generan con
   `npm run admin:user`).
3. Cargar las 5 variables en Vercel (Production y Preview).
4. Desactivar GitHub Pages en la configuración del repo. El workflow
   `deploy.yml` se borra en el código.
