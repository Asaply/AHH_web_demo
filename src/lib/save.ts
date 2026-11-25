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
