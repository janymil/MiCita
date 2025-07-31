import { useUser } from '@stackframe/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth-context';

interface SyncedUser {
    id: number;
    email: string;
    name: string;
    stackAuthId: string;
}

interface Business {
    id: number;
    name: string;
    slug: string;
    description: string;
    category: string;
    // Add other business properties as needed
}

interface SyncResult {
    user: SyncedUser;
    businesses: Business[];
}

export function useUserSync() {
    const { user, isAuthenticated } = useAuth();
    const stackUser = useUser(); // Get Stack user directly
    const [syncedUser, setSyncedUser] = useState<SyncedUser | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function syncUser() {
            if (!isAuthenticated || !user || !stackUser) {
                setSyncedUser(null);
                setBusinesses([]);
                return;
            }

            // Skip if already synced
            if (syncedUser?.stackAuthId === user.id) {
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Get the Stack Auth token
                const token = await stackUser.getIdToken();

                const response = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Sync failed: ${response.statusText}`);
                }

                const result: SyncResult = await response.json();
                setSyncedUser(result.user);
                setBusinesses(result.businesses);
            } catch (err) {
                console.error('Error syncing user:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        }

        syncUser();
    }, [isAuthenticated, user, stackUser, syncedUser?.stackAuthId]);

    return {
        syncedUser,
        businesses,
        isLoading,
        error,
        refetch: () => {
            setSyncedUser(null); // This will trigger a re-sync
        }
    };
}
