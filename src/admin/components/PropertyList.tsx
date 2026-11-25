import { photoUrl, statusLabel, type Property } from '../../lib/schema';
import { move } from '../format';
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
        <a href="/admin/propiedades/nueva" class={`${ui.btn} shrink-0`}>+ Nueva</a>
      </div>

      <ul class="space-y-3">
        {list.map((p, i) => (
          <li key={p.slug} class={`${ui.card} !p-3 sm:!p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 ${p.hidden ? 'opacity-60' : ''}`}>
            <Thumb src={p.photos[0] ? photoUrl(p.photoDir, p.photos[0], true) : ''} rawBase={rawBase} alt="" class="h-16 w-20 sm:h-20 sm:w-28 rounded-md shrink-0" />
            <div class="flex-1 min-w-0">
              <a href={`/admin/propiedades/${p.slug}`} class="font-semibold hover:underline block truncate">{p.name}</a>
              <p class="text-sm text-gray-600 truncate">{p.price}</p>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span class={`${ui.badge} ${statusTone[p.status]}`}>{statusLabel[p.status]}</span>
                {p.hidden && <span class={`${ui.badge} bg-bone-2 text-gray-700`}>Oculta</span>}
              </div>
            </div>
            <div class="flex gap-1.5 items-center justify-end w-full sm:w-auto">
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
