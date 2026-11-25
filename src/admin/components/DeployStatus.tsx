import { useEffect, useState } from 'preact/hooks';
import type { DeployState } from '../../lib/github';
import { fetchDeployState } from '../api';

const copy: Record<DeployState, { text: string; tone: string }> = {
  pending: { text: 'Publicando el último cambio…', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
  success: { text: 'El sitio está al día con el último cambio.', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  failure: { text: 'La última publicación falló; el sitio sigue con la versión anterior. Avisa al desarrollador.', tone: 'bg-red-50 border-red-200 text-red-800' },
};

export default function DeployStatus({ commit }: { commit: string }) {
  const [state, setState] = useState<DeployState | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      const next = await fetchDeployState(commit).catch(() => null);
      if (stopped) return;
      if (next) setState(next);
      if (next !== 'success' && next !== 'failure') timer = setTimeout(poll, 5000);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [commit]);
  if (!state) return null;
  return <p class={`rounded-lg border px-4 py-3 text-sm ${copy[state].tone}`} role="status">{copy[state].text}</p>;
}
