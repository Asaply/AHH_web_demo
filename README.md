# AHH Construcción y Remodelación — sitio web

Astro 7 + Tailwind 4, publicado en Vercel. El contenido editable (propiedades,
proyectos, contacto, servicios) vive en `src/content/*.json` y se edita desde el
panel `/admin`.

## Desarrollo

```sh
npm install
cp .env.example .env     # ver "Panel" abajo
astro dev --background   # http://localhost:4321
npm test                 # unitarias (vitest)
npm run test:e2e         # E2E del panel: requiere dev server y E2E_EMAIL / E2E_PASSWORD
```

En local el panel escribe en la rama `admin-sandbox` (`GITHUB_BRANCH` en `.env`),
nunca en `main`.

## Panel /admin

Cada guardado hace un commit en GitHub (`Panel: …`) y Vercel publica en 1–2 min.
Si un build falla, Vercel deja la versión anterior en línea. Los datos se validan
con los mismos schemas (`src/lib/schema.ts`) en el panel y al compilar.

Variables (Vercel → Settings → Environment Variables):

| Variable | Valor |
|---|---|
| `ADMIN_USERS` | `[{"email","name","hash"}, …]`. Cada entrada sale de `npm run admin:user -- correo "Nombre"` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Cambiarlo cierra todas las sesiones |
| `GITHUB_TOKEN` | Token fine-grained: solo `Asaply/AHH_web_demo`; Contents read/write, Deployments read |
| `GITHUB_REPO` | `Asaply/AHH_web_demo` |
| `GITHUB_BRANCH` | `main` en Production; `admin-sandbox` en Preview y local |

- Agregar o quitar usuarios = editar `ADMIN_USERS` y redeploy. Quitar a alguien
  corta su acceso aunque tenga sesión abierta.
- Contraseña olvidada: generar un hash nuevo con `npm run admin:user`.
- Deshacer un cambio del panel: `git revert <sha>` del commit `Panel: …` y push.
- El repo es público: el panel no guarda los campos de uso interno de las fichas
  (precio mínimo, gravamen, observaciones), y el autor de sus commits usa el
  correo `panel@ahh-construccion.invalid`.
- Lo que el panel no edita (catálogo de servicios, valores, proceso, imágenes de
  hero y servicios, video) sigue en `src/data/site.ts` y `public/`.
