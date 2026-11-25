import { useState } from 'preact/hooks';
import type { Project, Property } from '../../lib/schema';
import { uploadPhoto } from '../api';
import { changedLabels, errorFor, newPhotoName, slugify, summarize } from '../format';
import { preparePhoto } from '../image';
import { blankProperty, photoChanges, PROPERTY_LABELS, type PendingPhoto } from '../property';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { Checkbox, NumberInput, Select, TextArea, TextInput } from './fields';
import { Gallery } from './Gallery';
import { PairList, RowActions, StringList } from './lists';
import { SaveBar } from './SaveBar';

type Props = { properties: Property[]; sha: string; slug: string | null; projects: Project[]; rawBase: string };

export default function PropertyEditor({ properties, sha, slug, projects, rawBase }: Props) {
  const isNew = slug === null;
  const [index] = useState(() => (isNew ? properties.length : properties.findIndex(p => p.slug === slug)));
  const initial = isNew ? [...properties, blankProperty(properties.find(p => p.kind === 'casa'))] : properties;
  const editor = useEditor('properties', initial, sha, properties);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, setPending] = useState<Record<string, PendingPhoto>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const p = editor.value[index];
  if (!p) return <p>No se encontró la propiedad. <a class="underline" href="/admin/propiedades">Volver a la lista</a></p>;

  const err = (path: string) => errorFor(editor.errors, `${index}.${path}`);
  const update = (patch: Partial<Property>) => editor.setValue(list => list.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const opt = (v: string) => (v.trim() ? v : undefined);
  const isHouse = p.kind === 'casa';
  const dir = isNew ? `/img/propiedades/${p.slug || 'nueva'}` : p.photoDir;
  const protectedUrls = new Set(projects.map(project => project.image));
  const busy = Object.values(pending).some(item => item.state === 'processing');

  async function addFiles(files: File[]) {
    setUploadErrors([]);
    // Una por una: en celulares, decodificar varias fotos de 12 MP a la vez
    // agota la memoria.
    for (const file of files) {
      const name = newPhotoName();
      setPending(current => ({ ...current, [name]: { state: 'processing' } }));
      editor.setValue(list => list.map((x, i) => (i === index ? { ...x, photos: [...x.photos, name] } : x)));
      try {
        const { full, small } = await preparePhoto(file);
        const [fullSha, smallSha] = await Promise.all([uploadPhoto(full), uploadPhoto(small)]);
        setPending(current => ({ ...current, [name]: { state: 'ready', fullSha, smallSha, preview: URL.createObjectURL(small) } }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo subir la foto.';
        setUploadErrors(current => [...current, `${file.name}: ${message}`]);
        setPending(({ [name]: _, ...rest }) => rest);
        editor.setValue(list => list.map((x, i) => (i === index ? { ...x, photos: x.photos.filter(n => n !== name) } : x)));
      }
    }
  }

  function removePhoto(name: string) {
    update({ photos: p.photos.filter(n => n !== name) });
    if (pending[name]) {
      setPending(({ [name]: _, ...rest }) => rest);
    } else {
      setRemoved(current => [...current, name]);
    }
  }

  async function save() {
    const finalProperty = isNew ? { ...p, photoDir: `/img/propiedades/${p.slug}` } : p;
    const list = editor.value.map((x, i) => (i === index ? finalProperty : x));
    const photos = photoChanges(finalProperty, pending, removed, protectedUrls);
    const before = editor.saved[index];
    const changes = before ? changedLabels(before, finalProperty, PROPERTY_LABELS) : [];
    const added = photos.add.length / 2;
    const deleted = photos.remove.length / 2;
    if (added) changes.push(`${added} foto${added > 1 ? 's' : ''} nueva${added > 1 ? 's' : ''}`);
    if (deleted) changes.push(`${deleted} foto${deleted > 1 ? 's' : ''} borrada${deleted > 1 ? 's' : ''}`);
    if (before && JSON.stringify(before.photos) !== JSON.stringify(finalProperty.photos) && !added && !deleted) changes.push('orden de fotos');
    const summary = isNew ? summarize(`Nueva propiedad: ${p.name}`, []) : summarize(p.name, changes);
    if (await editor.save(summary, photos, list)) {
      setPending({});
      setRemoved([]);
      if (isNew) location.replace(`/admin/propiedades/${finalProperty.slug}`);
    }
  }

  async function remove() {
    const linked = projects.filter(project => project.property === p.slug).map(project => project.name);
    const warning = linked.length ? `\n\nEl proyecto ${linked.join(', ')} dejará de enlazar a esta ficha.` : '';
    if (!confirm(`¿Borrar «${p.name}»? También se borran sus fotos.${warning}`)) return;
    const list = editor.value.filter((_, i) => i !== index);
    const photos = photoChanges({ ...p, photos: [] }, {}, p.photos.filter(n => !pending[n]), protectedUrls);
    if (await editor.save(summarize(`Borra propiedad: ${p.name}`, []), { add: [], remove: photos.remove }, list)) {
      location.replace('/admin/propiedades');
    }
  }

  return (
    <>
      <a href="/admin/propiedades" class="text-sm underline">← Propiedades</a>
      <h1 class={`${ui.h1} mt-3`}>{isNew ? 'Nueva propiedad' : p.name || 'Sin nombre'}</h1>
      {!isNew && !p.hidden && <a href={`/propiedades/${p.slug}`} target="_blank" rel="noopener" class="text-sm underline">Ver en el sitio ↗</a>}

      {editor.restored && (
        <p class={`${ui.notice} bg-amber-50 border-amber-200 mt-4`}>Recuperamos los cambios que no alcanzaste a guardar. Revísalos y guarda.</p>
      )}
      <p class={`${ui.notice} bg-bone-2 border-sand/60 mt-4 mb-6`}>
        Todo lo que escribas aquí es público. No pongas precio mínimo, gravámenes ni notas internas.
      </p>

      <div class="space-y-6">
        <section class={ui.card}>
          <h2 class={ui.h2}>Datos generales</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <TextInput label="Nombre" value={p.name} error={err('name')} onInput={name => update(isNew && !slugTouched ? { name, slug: slugify(name) } : { name })} />
            </div>
            {isNew ? (
              <TextInput label="Dirección web" value={p.slug} error={err('slug')} hint={`Quedará en /propiedades/${p.slug || '…'} y no se puede cambiar después.`} onInput={value => { setSlugTouched(true); update({ slug: slugify(value) }); }} />
            ) : (
              <p class="text-sm text-gray-600 self-end">Dirección web: /propiedades/{p.slug}</p>
            )}
            <Select label="Estatus" value={p.status} onChange={status => update({ status })} options={[
              { value: 'disponible', label: 'En venta' },
              { value: 'apartado', label: 'Apartada' },
              { value: 'vendido', label: 'Vendida' },
            ]} />
            <Select label="Tipo" value={p.kind} onChange={kind => update({ kind })} options={[
              { value: 'casa', label: 'Casa' },
              { value: 'terreno', label: 'Terreno' },
            ]} />
            <TextInput label="Precio" value={p.price} error={err('price')} hint="Tal como se mostrará, p. ej. $2,390,000 MXN" onInput={price => update({ price })} />
            <TextInput label="Ubicación" value={p.location} error={err('location')} hint="Colonia o fraccionamiento y ciudad" onInput={location => update({ location })} />
            <TextInput label="Dirección (opcional)" value={p.address} error={err('address')} hint="Déjala vacía en casas vendidas" onInput={v => update({ address: opt(v) })} />
            <div class="sm:col-span-2">
              <TextInput label="Liga del mapa (opcional)" type="url" value={p.mapUrl} error={err('mapUrl')} placeholder="https://maps.app.goo.gl/…" onInput={v => update({ mapUrl: opt(v) })} />
            </div>
            <div class="sm:col-span-2">
              <TextArea label="Descripción corta" value={p.summary} error={err('summary')} hint="Una o dos frases; aparece en la tarjeta y en la ficha." onInput={summary => update({ summary })} />
            </div>
            <div class="sm:col-span-2">
              <Checkbox label="Ocultar del sitio" hint="Se guarda pero no se publica." checked={Boolean(p.hidden)} onChange={hidden => update({ hidden: hidden || undefined })} />
            </div>
          </div>
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Superficies y espacios</h2>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumberInput label="Terreno (m²)" value={p.landArea} error={err('landArea')} onChange={v => update({ landArea: v as number })} />
            {isHouse && <NumberInput label="Construcción (m²)" value={p.builtArea} error={err('builtArea')} onChange={builtArea => update({ builtArea })} />}
            <TextInput label="Frente" value={p.frontage} error={err('frontage')} placeholder="7 m" onInput={v => update({ frontage: opt(v) })} />
            <TextInput label="Fondo" value={p.depth} error={err('depth')} placeholder="17.15 m" onInput={v => update({ depth: opt(v) })} />
            {isHouse && (
              <>
                <NumberInput label="Plantas" value={p.floors} error={err('floors')} onChange={floors => update({ floors })} />
                <NumberInput label="Recámaras" value={p.beds} error={err('beds')} onChange={beds => update({ beds })} />
                <NumberInput label="Baños" value={p.baths} error={err('baths')} hint="Medio baño = .5 (2.5)" onChange={baths => update({ baths })} />
                <NumberInput label="Cochera (autos)" value={p.parking} error={err('parking')} onChange={parking => update({ parking })} />
              </>
            )}
          </div>
        </section>

        {isHouse && (
          <section class={ui.card}>
            <h2 class={ui.h2}>Distribución</h2>
            <div class="space-y-5">
              {p.distribution.map((floor, i) => (
                <div class="border border-sand/60 rounded-lg p-4">
                  <div class="flex gap-2 items-end mb-3">
                    <div class="flex-1">
                      <TextInput label="Planta o grupo" value={floor.floor} error={err(`distribution.${i}.floor`)} placeholder="Planta baja" onInput={name => update({ distribution: p.distribution.map((f, j) => (j === i ? { ...f, floor: name } : f)) })} />
                    </div>
                    <RowActions index={i} count={p.distribution.length} label={floor.floor || 'planta'}
                      onMove={to => update({ distribution: p.distribution.map((f, j, all) => (j === i ? all[to] : j === to ? all[i] : f)) })}
                      onRemove={() => update({ distribution: p.distribution.filter((_, j) => j !== i) })} />
                  </div>
                  <StringList label="Espacios" items={floor.rooms} addLabel="Agregar espacio" placeholder="Sala"
                    errorAt={k => err(`distribution.${i}.rooms.${k}`)}
                    onChange={rooms => update({ distribution: p.distribution.map((f, j) => (j === i ? { ...f, rooms } : f)) })} />
                </div>
              ))}
            </div>
            <button type="button" class={`${ui.btnGhost} mt-4`} onClick={() => update({ distribution: [...p.distribution, { floor: '', rooms: [] }] })}>+ Agregar planta</button>
          </section>
        )}

        <section class={ui.card}>
          <h2 class={ui.h2}>{isHouse ? 'Por qué esta casa' : 'Lo más importante'}</h2>
          <StringList label="Diferenciadores" items={p.highlights} addLabel="Agregar" placeholder="Construcción 100% de ladrillo rojo" errorAt={k => err(`highlights.${k}`)} onChange={highlights => update({ highlights })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>{isHouse ? 'Acabados y equipamiento' : 'Características'}</h2>
          <PairList label="Renglones" items={p.finishes} addLabel="Agregar renglón" labelPlaceholder="Pisos" valuePlaceholder="Porcelanato de 60 × 60" errorAt={k => err(`finishes.${k}`)} onChange={finishes => update({ finishes })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Condiciones de venta</h2>
          <PairList label="Renglones" items={p.terms} addLabel="Agregar condición" labelPlaceholder="Crédito" valuePlaceholder="Se acepta todo tipo de crédito" errorAt={k => err(`terms.${k}`)} onChange={terms => update({ terms })} />
        </section>

        <section class={ui.card}>
          <h2 class={ui.h2}>Fotos</h2>
          {uploadErrors.length > 0 && (
            <ul class={`${ui.notice} bg-red-50 border-red-200 text-red-800 mb-4 space-y-1`}>
              {uploadErrors.map(message => <li>{message}</li>)}
            </ul>
          )}
          {isNew && !p.slug ? (
            <p class="text-sm text-gray-600">Escribe el nombre para poder subir fotos.</p>
          ) : (
            <Gallery dir={dir} photos={p.photos} pending={pending} rawBase={rawBase} onChange={photos => update({ photos })} onRemove={removePhoto} onFiles={addFiles} />
          )}
        </section>

        {!isNew && (
          <section class={`${ui.card} border-red-200`}>
            <h2 class={ui.h2}>Borrar propiedad</h2>
            <p class="text-sm text-gray-600 mb-3">Si solo quieres quitarla del sitio por un tiempo, usa “Ocultar del sitio”.</p>
            <button type="button" class={ui.btnDanger} onClick={remove}>Borrar «{p.name}»</button>
          </section>
        )}
      </div>

      <SaveBar dirty={editor.dirty} status={editor.status} onSave={save} blocked={busy ? 'Espera a que terminen de subir las fotos…' : undefined} label={isNew ? 'Crear propiedad' : 'Guardar cambios'} />
    </>
  );
}
