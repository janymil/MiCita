import { useUser } from "@stackframe/react";
import { useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export function useStackUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get user from Stack
    try {
      const stackUser = useUser();
      if (stackUser) {
        setUser({
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          displayName: stackUser.displayName,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log("Stack user hook not available, using fallback");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { user, isLoading };
}
