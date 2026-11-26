import { move } from '../format';
import { ui } from '../ui';

export function RowActions({ index, count, onMove, onRemove, label }: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div class="flex gap-1">
      <button type="button" class={ui.iconBtn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Subir ${label}`}>↑</button>
      <button type="button" class={ui.iconBtn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Bajar ${label}`}>↓</button>
      <button type="button" class={ui.iconBtn} onClick={onRemove} aria-label={`Quitar ${label}`}>✕</button>
    </div>
  );
}

export function StringList({ label, items, onChange, addLabel, placeholder, errorAt }: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  placeholder?: string;
  errorAt?: (index: number) => string | undefined;
}) {
  return (
    <fieldset>
      <legend class={ui.label}>{label}</legend>
      <div class="space-y-2">
        {items.map((item, i) => {
          const error = errorAt?.(i);
          return (
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <input
                  class={`${ui.input} ${error ? ui.inputError : ''}`}
                  value={item}
                  placeholder={placeholder}
                  aria-label={`${label} ${i + 1}`}
                  onInput={e => onChange(items.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                />
                {error && <span class={ui.error}>{error}</span>}
              </div>
              <RowActions index={i} count={items.length} label={item || 'elemento'} onMove={to => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      <button type="button" class={`${ui.btnGhost} mt-2`} onClick={() => onChange([...items, ''])}>+ {addLabel}</button>
    </fieldset>
  );
}

type Pair = { label: string; value: string };

export function PairList({ label, items, onChange, addLabel, labelPlaceholder, valuePlaceholder, errorAt }: {
  label: string;
  items: Pair[];
  onChange: (items: Pair[]) => void;
  addLabel: string;
  labelPlaceholder: string;
  valuePlaceholder: string;
  errorAt?: (path: string) => string | undefined;
}) {
  const update = (i: number, patch: Partial<Pair>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <fieldset>
      <legend class={ui.label}>{label}</legend>
      <div class="space-y-2">
        {items.map((item, i) => {
          const error = errorAt?.(`${i}.label`) ?? errorAt?.(`${i}.value`);
          return (
            <div class="flex gap-2 items-start">
              <div class="flex-1 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <input class={ui.input} value={item.label} placeholder={labelPlaceholder} aria-label={`${label} ${i + 1}: nombre`} onInput={e => update(i, { label: e.currentTarget.value })} />
                <input class={ui.input} value={item.value} placeholder={valuePlaceholder} aria-label={`${label} ${i + 1}: detalle`} onInput={e => update(i, { value: e.currentTarget.value })} />
                {error && <span class={`${ui.error} sm:col-span-2`}>{error}</span>}
              </div>
              <RowActions index={i} count={items.length} label={item.label || 'renglón'} onMove={to => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          );
        })}
      </div>
      <button type="button" class={`${ui.btnGhost} mt-2`} onClick={() => onChange([...items, { label: '', value: '' }])}>+ {addLabel}</button>
    </fieldset>
  );
}
