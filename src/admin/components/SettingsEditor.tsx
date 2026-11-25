import type { Settings } from '../../lib/schema';
import { changedLabels, errorFor, summarize } from '../format';
import { ui } from '../ui';
import { useEditor } from '../useEditor';
import { NumberInput, PhoneInput, TextInput } from './fields';
import { SaveBar } from './SaveBar';

const CONTACT_LABELS = { phoneDigits: 'teléfono', visitsWhatsapp: 'WhatsApp de visitas', street: 'calle', colonia: 'colonia', city: 'ciudad', coverage: 'cobertura', hours: 'horario' };
const BRAND_LABELS = { name: 'nombre', slogan: 'eslogan', yearsOfExperience: 'años de experiencia' };

export default function SettingsEditor({ initial, sha }: { initial: Settings; sha: string }) {
  const editor = useEditor('settings', initial, sha);
  const s = editor.value;
  const err = (path: string) => errorFor(editor.errors, path);
  const contact = (patch: Partial<Settings['contact']>) => editor.setValue(v => ({ ...v, contact: { ...v.contact, ...patch } }));
  const brand = (patch: Partial<Settings['brand']>) => editor.setValue(v => ({ ...v, brand: { ...v.brand, ...patch } }));

  const save = () => {
    const changes = [
      ...changedLabels(editor.saved.contact, s.contact, CONTACT_LABELS),
      ...changedLabels(editor.saved.brand, s.brand, BRAND_LABELS),
    ];
    editor.save(summarize('Contacto', changes));
  };

  return (
    <>
      <h1 class={ui.h1}>Contacto</h1>
      <p class="text-sm text-gray-600 mb-6">Aparece en el encabezado, el pie de página y la página de contacto.</p>
      <div class="space-y-6">
        <section class={ui.card}>
          <h2 class={ui.h2}>Teléfonos</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <PhoneInput label="Teléfono y WhatsApp general" value={s.contact.phoneDigits} error={err('contact.phoneDigits')} hint="Mientras esté vacío, el sitio oculta los botones de llamar y WhatsApp." onChange={phoneDigits => contact({ phoneDigits })} />
            <PhoneInput label="WhatsApp para agendar visitas" value={s.contact.visitsWhatsapp} error={err('contact.visitsWhatsapp')} hint="Lo usa el botón “Agendar visita” de cada propiedad." onChange={visitsWhatsapp => contact({ visitsWhatsapp })} />
          </div>
        </section>
        <section class={ui.card}>
          <h2 class={ui.h2}>Oficina</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <TextInput label="Calle y número" value={s.contact.street} error={err('contact.street')} onInput={street => contact({ street })} />
            <TextInput label="Colonia" value={s.contact.colonia} error={err('contact.colonia')} onInput={colonia => contact({ colonia })} />
            <TextInput label="Ciudad" value={s.contact.city} error={err('contact.city')} onInput={city => contact({ city })} />
            <TextInput label="Horario" value={s.contact.hours} error={err('contact.hours')} onInput={hours => contact({ hours })} />
            <div class="sm:col-span-2">
              <TextInput label="Cobertura" value={s.contact.coverage} error={err('contact.coverage')} hint="Se lee “… en {cobertura}”, p. ej. “Chihuahua y todo el estado”." onInput={coverage => contact({ coverage })} />
            </div>
          </div>
        </section>
        <section class={ui.card}>
          <h2 class={ui.h2}>Empresa</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <TextInput label="Nombre" value={s.brand.name} error={err('brand.name')} onInput={name => brand({ name })} />
            <NumberInput label="Años de experiencia" value={s.brand.yearsOfExperience} error={err('brand.yearsOfExperience')} onChange={v => brand({ yearsOfExperience: v as number })} />
            <div class="sm:col-span-2">
              <TextInput label="Eslogan" value={s.brand.slogan} error={err('brand.slogan')} onInput={slogan => brand({ slogan })} />
            </div>
          </div>
        </section>
      </div>
      <SaveBar dirty={editor.dirty} status={editor.status} onSave={save} />
    </>
  );
}
