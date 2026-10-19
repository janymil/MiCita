/**
 * In-memory access-token store with a localStorage mirror.
 *
 * The refresh token lives in an HttpOnly cookie and is never readable here;
 * the short-lived access token is kept in memory and mirrored so a page reload
 * can restore a session without flashing the login screen.
 */

const MEMORY_KEY = "__micita_access_token__";
const STORAGE_KEY = "micita.accessToken";

declare global {
  interface Window {
    [MEMORY_KEY]?: string;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
      if (typeof window !== "undefined") window[MEMORY_KEY] = token;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      if (typeof window !== "undefined") delete window[MEMORY_KEY];
    }
  } catch {
    // Storage may be unavailable (private mode); memory still works.
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) accessToken = stored;
    return accessToken;
  } catch {
    return null;
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

/** Decode the JWT `exp` (seconds) without verifying the signature. */
export function getTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(token: string, skewMs = 60_000): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry - Date.now() < skewMs;
}
