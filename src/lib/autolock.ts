const KEY = "vault_lock_minutes";

export function getLockMinutes() {
  if (typeof window === "undefined") return 5;
  const raw = Number(localStorage.getItem(KEY));
  if (Number.isNaN(raw)) return 5;
  return raw;
}

export function setLockMinutes(minutes: number) {
  localStorage.setItem(KEY, String(minutes));
}

export function lockMs() {
  const minutes = getLockMinutes();
  if (minutes <= 0) return 0;
  return minutes * 60 * 1000;
}
