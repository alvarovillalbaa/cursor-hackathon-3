// Per-game identity persisted in localStorage. No auth: a player is just a name
// plus a generated id. The host additionally holds a hostToken.

export interface StoredSession {
  code: string;
  playerId: string;
  name: string;
  isHost: boolean;
  hostToken?: string;
}

function key(code: string): string {
  return `yoga-kahoot:session:${code.toUpperCase()}`;
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(session.code), JSON.stringify(session));
  } catch {
    // Ignore quota / privacy-mode errors.
  }
}

export function getSession(code: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(code));
  } catch {
    // ignore
  }
}
