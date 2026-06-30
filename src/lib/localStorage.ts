export const USER_STORAGE_KEYS = ['wms_users', 'users'] as const;

export function loadArrayFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArrayToStorage<T>(key: string, records: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // ignore failing storage writes
  }
}

export function loadUsersFromStorage<T = any>(): T[] {
  if (typeof window === 'undefined') return [];
  for (const key of USER_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore parse errors
    }
  }
  return [];
}

export function saveUsersToStorage<T = any>(users: T[]): void {
  if (typeof window === 'undefined') return;
  for (const key of USER_STORAGE_KEYS) {
    try {
      localStorage.setItem(key, JSON.stringify(users));
    } catch {
      // ignore failing storage writes
    }
  }
}

export function buildLocalId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
