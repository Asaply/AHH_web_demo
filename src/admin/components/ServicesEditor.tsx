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
            <section key={s.slug} class={ui.card}>
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
