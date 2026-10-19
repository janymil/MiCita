import { useEffect, useState } from "react";
import { apiFetch, type AuthUser } from "@/lib/auth-api";
import { useAuth } from "@/contexts/auth-context";

interface Business {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  [key: string]: unknown;
}

interface SyncResult {
  user: AuthUser;
  businesses: Business[];
}

/**
 * Fetches the authenticated user's businesses. The profile itself now comes
 * from the auth context; this hook only resolves the business list.
 */
export function useUserSync() {
  const { user, isAuthenticated } = useAuth();
  const [syncedUser, setSyncedUser] = useState<AuthUser | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isAuthenticated || !user) {
        setSyncedUser(null);
        setBusinesses([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch("/api/dashboard/businesses", { method: "GET" });
        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }
        const data = (await response.json()) as Business[] | SyncResult;
        const list = Array.isArray(data) ? data : data.businesses;
        setSyncedUser(user);
        setBusinesses(list ?? []);
      } catch (err) {
        console.error("Error syncing user:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    syncUser();
  }, [isAuthenticated, user]);

  return {
    syncedUser,
    businesses,
    isLoading,
    error,
    refetch: () => setSyncedUser(null),
  };
}
