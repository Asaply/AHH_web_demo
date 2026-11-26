/* Límite de intentos de login. Vive en la memoria de cada función de Vercel,
   así que es de mejor esfuerzo: frena ataques desde una instancia, no un
   ataque distribuido. Para eso está la espera fija en cada fallo. */
export function createThrottle(max = 5, windowMs = 15 * 60 * 1000) {
  const failures = new Map<string, number[]>();
  const recent = (key: string, now: number) => (failures.get(key) ?? []).filter(t => now - t < windowMs);
  return {
    isBlocked: (key: string, now = Date.now()) => recent(key, now).length >= max,
    fail: (key: string, now = Date.now()) => {
      failures.set(key, [...recent(key, now), now]);
    },
    reset: (key: string) => {
      failures.delete(key);
    },
  };
}

export const loginThrottle = createThrottle();
