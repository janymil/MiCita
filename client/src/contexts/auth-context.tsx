import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, refreshSession, type AuthUser } from "@/lib/auth-api";
import { clearAccessToken, getAccessToken } from "@/lib/token-store";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Bootstrap: if we hold an access token, hydrate the user; otherwise try the
  // refresh cookie so a reload restores the session silently.
  useEffect(() => {
    (async () => {
      try {
        let hydrated: AuthUser | null = null;
        if (getAccessToken()) {
          hydrated = await authApi.me();
        }
        if (!hydrated) {
          const refreshed = await refreshSession();
          hydrated = refreshed?.user ?? null;
        }
        if (mounted.current) setUser(hydrated);
      } catch {
        if (mounted.current) setUser(null);
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; phone?: string }) => {
      const res = await authApi.register(input);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await refreshSession();
    setUser(res?.user ?? null);
    return res?.user ?? null;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
