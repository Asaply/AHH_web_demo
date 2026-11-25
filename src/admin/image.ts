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
