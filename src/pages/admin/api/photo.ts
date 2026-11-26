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
