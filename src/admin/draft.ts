/* Si la sesión vence al guardar, el borrador sobrevive al login. */
const key = () => `ahh-draft:${location.pathname}`;

export function stashDraft(value: unknown) {
  try {
    sessionStorage.setItem(key(), JSON.stringify(value));
  } catch {
    /* sin almacenamiento: se pierde el borrador, no la sesión */
  }
}

export function takeDraft<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(key());
    if (!raw) return null;
    sessionStorage.removeItem(key());
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
