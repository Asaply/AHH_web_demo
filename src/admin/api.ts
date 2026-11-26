import type { DeployState } from '../lib/github';
import type { FieldError, SavePayload } from '../lib/save';

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldError[];
  constructor(message: string, status: number, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('Sin conexión. Revisa tu internet e intenta de nuevo.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'Algo salió mal. Intenta de nuevo.', res.status, body.fieldErrors ?? []);
  return body as T;
}

export const saveContent = (name: string, payload: SavePayload) =>
  request<{ commit: string; sha: string }>(`/admin/api/content/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const uploadPhoto = (jpeg: Blob) =>
  request<{ blobSha: string }>('/admin/api/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: jpeg,
  }).then(r => r.blobSha);

export const fetchDeployState = (sha: string) =>
  request<{ state: DeployState }>(`/admin/api/status?sha=${sha}`).then(r => r.state);
