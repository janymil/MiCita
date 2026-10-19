import { clearAccessToken, getAccessToken, isTokenExpiringSoon, setAccessToken } from "./token-store";

const AUTH_BASE = "/api/auth";
const CSRF_COOKIE = "micita_csrf";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean | null;
  phoneVerified: boolean | null;
  createdAt?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn?: string;
  requiresEmailVerification?: boolean;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

// Single-flight refresh so concurrent 401s don't storm the endpoint.
let refreshPromise: Promise<AuthResponse | null> | null = null;

async function parseError(res: Response): Promise<never> {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = await res.text().catch(() => undefined);
  }
  const message =
    payload && typeof payload === "object" && "message" in payload
      ? String((payload as any).message)
      : `Request failed with status ${res.status}`;
  throw new ApiError(res.status, message, payload);
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

export async function refreshSession(): Promise<AuthResponse | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        clearAccessToken();
        return null;
      }
      const data = (await res.json()) as AuthResponse;
      setAccessToken(data.accessToken);
      return data;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Authenticated fetch with transparent access-token refresh and CSRF header
 * for state-changing requests.
 */
export async function apiFetch(input: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || "GET").toUpperCase();

  let token = getAccessToken();
  if (token && isTokenExpiringSoon(token)) {
    const refreshed = await refreshSession();
    token = refreshed?.accessToken ?? getAccessToken();
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set("x-csrf-token", csrf);
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (init.body && !headers.has("Content-Type") && !isFormData) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry && !input.includes("/api/auth/refresh")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const csrf = readCookie(CSRF_COOKIE);
        if (csrf) retryHeaders.set("x-csrf-token", csrf);
      }
      return fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
    }
  }

  return res;
}

async function authRequest<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await apiFetch(`${AUTH_BASE}${path}`, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

function persist(data: AuthResponse): AuthResponse {
  setAccessToken(data.accessToken);
  return data;
}

export const authApi = {
  register: async (input: { email: string; password: string; name: string; phone?: string }) =>
    persist(await authRequest<AuthResponse>("/register", input)),

  login: async (input: { email: string; password: string }) => persist(await authRequest<AuthResponse>("/login", input)),

  logout: async () => {
    try {
      await authRequest("/logout", {});
    } finally {
      clearAccessToken();
    }
  },

  me: async () => {
    const res = await apiFetch(`${AUTH_BASE}/me`);
    if (!res.ok) {
      if (res.status === 401) return null;
      await parseError(res);
    }
    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  },

  requestEmailOtp: (email: string, purpose: "login" | "verify_email" = "login") =>
    authRequest<{ ok: boolean; sent: boolean; expiresAt: string; devCode?: string }>("/otp/email/request", {
      email,
      purpose,
    }),

  verifyEmailOtp: async (email: string, code: string, purpose: "login" | "verify_email" = "login") =>
    persist(await authRequest<AuthResponse>("/otp/email/verify", { email, code, purpose })),

  requestPhoneOtp: (phone: string) =>
    authRequest<{ ok: boolean; sent: boolean; phone: string; expiresAt: string; devCode?: string }>(
      "/otp/phone/request",
      { phone },
    ),

  verifyPhoneOtp: async (phone: string, code: string) =>
    persist(await authRequest<AuthResponse>("/otp/phone/verify", { phone, code })),

  forgotPassword: (email: string) =>
    authRequest<{ ok: boolean; devToken?: string }>("/password/forgot", { email }),

  resetPassword: (token: string, password: string) => authRequest<{ ok: boolean }>("/password/reset", { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    authRequest<{ ok: boolean }>("/password/change", { currentPassword, newPassword }),

  providers: async () => {
    const res = await apiFetch(`${AUTH_BASE}/providers`);
    if (!res.ok) return { hasPassword: false, googleEnabled: false };
    return (await res.json()) as { hasPassword: boolean; googleEnabled: boolean };
  },

  googleLoginUrl: () => `${AUTH_BASE}/google/start`,
};
