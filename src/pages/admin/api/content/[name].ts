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
