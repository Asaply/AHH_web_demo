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
      <label class={`${ui.btn} cursor-pointer mb-2`}>
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
