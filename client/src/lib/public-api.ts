/**
 * Helpers for unauthenticated public pages (queue, promos).
 * Mutations use the double-submit CSRF cookie issued on page load.
 */

export function csrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|; )micita_csrf=([^;]*)/);
  return match ? { "x-csrf-token": decodeURIComponent(match[1]) } : {};
}

export async function publicJson<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(method !== "GET" ? csrfHeaders() : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.message || `Error ${res.status}`);
  return payload as T;
}
