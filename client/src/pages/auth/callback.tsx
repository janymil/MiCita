import { useEffect } from "react";
import { useLocation } from "wouter";
import { setAccessToken } from "@/lib/token-store";
import { useAuth } from "@/contexts/auth-context";

/**
 * Landing page for the Google OAuth redirect. The server has already set the
 * refresh cookie; we only need to capture the access token from the URL.
 */
export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    if (token) {
      setAccessToken(token);
    }
    refresh().finally(() => {
      // Strip the token from the URL before navigating.
      window.history.replaceState({}, "", "/auth/callback");
      setLocation("/dashboard");
    });
  }, [refresh, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto" />
        <p className="mt-4 text-sm text-gray-500">Completando el inicio de sesión…</p>
      </div>
    </div>
  );
}
