import type { SaveStatus } from '../useEditor';
import { ui } from '../ui';

const messages: Record<SaveStatus['kind'], string> = {
  idle: '',
  saving: 'Guardando…',
  publishing: 'Guardado. El sitio se actualiza en ~1 minuto…',
  published: 'Publicado. Ya se ve en el sitio.',
  'deploy-failed': 'La publicación falló; el sitio sigue mostrando la versión anterior. Avisa al desarrollador.',
  error: '',
};

export function SaveBar({ dirty, status, onSave, blocked, label = 'Guardar cambios' }: {
  dirty: boolean;
  status: SaveStatus;
  onSave: () => void;
  blocked?: string;
  label?: string;
}) {
  const message =
    blocked ??
    (status.kind === 'error'
      ? status.message
      : dirty && status.kind !== 'saving'
        ? 'Tienes cambios sin guardar.'
        : messages[status.kind] || 'Todo guardado.');
  const tone = status.kind === 'error' || status.kind === 'deploy-failed' ? 'text-red-700' : 'text-gray-700';
  return (
    <div class="fixed bottom-0 inset-x-0 lg:left-60 z-40 bg-white/95 backdrop-blur border-t border-sand/70 px-4 sm:px-6 lg:px-10 py-3">
      <div class="max-w-4xl flex items-center gap-4">
        <p class={`flex-1 text-sm ${tone}`} role="status" aria-live="polite">{message}</p>
        <button type="button" class={ui.btn} disabled={!dirty || Boolean(blocked) || status.kind === 'saving'} onClick={onSave}>
          {status.kind === 'saving' ? 'Guardando…' : label}
        </button>
      </div>
    </div>
  );
}
