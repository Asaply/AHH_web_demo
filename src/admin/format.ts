import type { FieldError } from '../lib/save';

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

/* El sitio guarda 52 + 10 dígitos. Si no se puede normalizar, devuelve los
   dígitos tal cual y el schema muestra el error. */
export function phoneToDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
  return local.length === 10 ? `52${local}` : digits;
}

export function digitsToPhone(digits: string): string {
  const local = digits.replace(/^52(?=\d{10}$)/, '');
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}

export function newPhotoName(now = Date.now(), random = Math.random): string {
  return `${now.toString(36)}${Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

export const errorFor = (errors: FieldError[], path: string) => errors.find(e => e.path === path)?.message;

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function changedLabels(before: object, after: object, labels: Record<string, string>): string[] {
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  return Object.keys(labels).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map(key => labels[key]);
}

export const summarize = (title: string, changes: string[]) =>
  (changes.length ? `${title} — ${changes.join(', ')}` : title).slice(0, 120);

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 24 * 60) return `hace ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
