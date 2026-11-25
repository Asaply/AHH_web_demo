import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FieldError, SavePayload } from '../lib/save';
import { ApiError, fetchDeployState, saveContent } from './api';
import { stashDraft, takeDraft } from './draft';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'publishing'; commit: string }
  | { kind: 'published' }
  | { kind: 'deploy-failed' }
  | { kind: 'error'; message: string };

/* Estado de un JSON editable: valor, sha base, guardado y seguimiento del
   deploy. `savedSnapshot` permite que una propiedad nueva cuente como cambio. */
export function useEditor<T>(name: string, initial: T, initialSha: string, savedSnapshot: T = initial) {
  const restored = useMemo(() => takeDraft<T>(), []);
  const [value, setValue] = useState<T>(restored ?? initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(savedSnapshot));
  const [sha, setSha] = useState(initialSha);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [errors, setErrors] = useState<FieldError[]>([]);
  const dirty = JSON.stringify(value) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (status.kind !== 'publishing') return;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      try {
        const state = await fetchDeployState(status.commit);
        if (stopped) return;
        if (state === 'success') return setStatus({ kind: 'published' });
        if (state === 'failure') return setStatus({ kind: 'deploy-failed' });
      } catch {
        /* un fallo de red no detiene el seguimiento */
      }
      if (!stopped && Date.now() - started < 10 * 60 * 1000) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status]);

  async function save(summary: string, photos?: SavePayload['photos'], next: T = value): Promise<boolean> {
    setStatus({ kind: 'saving' });
    setErrors([]);
    try {
      const result = await saveContent(name, { data: next, baseSha: sha, summary, photos });
      setSha(result.sha);
      setSaved(JSON.stringify(next));
      setValue(next);
      setStatus({ kind: 'publishing', commit: result.commit });
      return true;
    } catch (error) {
      const e = error instanceof ApiError ? error : new ApiError('Algo salió mal. Intenta de nuevo.', 0);
      if (e.status === 401) {
        stashDraft(next);
        location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
        return false;
      }
      setErrors(e.fieldErrors);
      setStatus({ kind: 'error', message: e.message });
      return false;
    }
  }

  return { value, setValue, saved: JSON.parse(saved) as T, dirty, status, errors, save, restored: restored !== null };
}
