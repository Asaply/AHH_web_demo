import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { digitsToPhone, phoneToDigits } from '../format';
import { ui } from '../ui';

type Base = { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, children }: Base & { children: ComponentChildren }) {
  return (
    <label class="block">
      <span class={ui.label}>{label}</span>
      {children}
      {error ? <span class={ui.error}>{error}</span> : hint ? <span class={ui.hint}>{hint}</span> : null}
    </label>
  );
}

const inputClass = (error?: string) => `${ui.input} ${error ? ui.inputError : ''}`;

export function TextInput({ label, error, hint, value, onInput, placeholder, type = 'text' }: Base & {
  value: string | undefined;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'url';
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input class={inputClass(error)} type={type} value={value ?? ''} placeholder={placeholder} aria-invalid={Boolean(error)} onInput={e => onInput(e.currentTarget.value)} />
    </Field>
  );
}

export function TextArea({ label, error, hint, value, onInput, rows = 3 }: Base & {
  value: string;
  onInput: (value: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea class={inputClass(error)} rows={rows} value={value} aria-invalid={Boolean(error)} onInput={e => onInput(e.currentTarget.value)} />
    </Field>
  );
}

/* Guarda el texto mientras se escribe ("2." no se convierte en 2 a media
   captura) y entrega número o undefined. */
export function NumberInput({ label, error, hint, value, onChange }: Base & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value?.toString() ?? '');
  useEffect(() => {
    const current = text.trim() === '' ? undefined : Number(text.replace(',', '.'));
    if (current !== value) setText(value?.toString() ?? '');
  }, [value]);
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        class={inputClass(error)}
        type="text"
        inputMode="decimal"
        value={text}
        aria-invalid={Boolean(error)}
        onInput={e => {
          const raw = e.currentTarget.value;
          setText(raw);
          const parsed = Number(raw.replace(',', '.'));
          onChange(raw.trim() === '' || !Number.isFinite(parsed) ? undefined : parsed);
        }}
      />
    </Field>
  );
}

export function Select<V extends string>({ label, error, hint, value, options, onChange }: Base & {
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select class={inputClass(error)} value={value} onChange={e => onChange(e.currentTarget.value as V)}>
        {options.map(option => <option value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label class="flex items-start gap-3">
      <input type="checkbox" class="mt-1 h-4 w-4 accent-dark" checked={checked} onChange={e => onChange(e.currentTarget.checked)} />
      <span>
        <span class="text-sm font-medium">{label}</span>
        {hint && <span class={ui.hint}>{hint}</span>}
      </span>
    </label>
  );
}

export function PhoneInput({ label, error, hint, value, onChange }: Base & { value: string; onChange: (digits: string) => void }) {
  const [text, setText] = useState(digitsToPhone(value));
  return (
    <Field label={label} error={error} hint={hint}>
      <input
        class={inputClass(error)}
        type="tel"
        inputMode="tel"
        placeholder="614 123 4567"
        value={text}
        aria-invalid={Boolean(error)}
        onInput={e => {
          setText(e.currentTarget.value);
          onChange(phoneToDigits(e.currentTarget.value));
        }}
      />
    </Field>
  );
}
