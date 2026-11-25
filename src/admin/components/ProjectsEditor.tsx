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
            <section key={`${i}-${project.slug}`} class={ui.card}>
              <div class="flex flex-col sm:flex-row gap-4 items-start">
                <Thumb src={preview} rawBase={rawBase} alt="" class="h-40 w-full sm:h-24 sm:w-32 rounded-md shrink-0" />
                <div class="flex-1 w-full grid sm:grid-cols-2 gap-3">
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
                    {!project.slug && <span class={ui.hint}>Escribe el nombre para poder subir foto.</span>}
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
