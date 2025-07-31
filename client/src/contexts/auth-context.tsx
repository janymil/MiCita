import { useUser } from "@stackframe/react";
import { createContext, ReactNode, useContext } from "react";

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use Stack's built-in useUser hook - should work with React 19
  const stackUser = useUser();

  // Convert Stack user to our User interface
  const user: User | null = stackUser ? {
    id: stackUser.id,
    email: stackUser.primaryEmail || '',
    displayName: stackUser.displayName
  } : null;

  const isLoading = false; // Stack manages loading state internally

  const logout = async () => {
    try {
      // Use Stack's signOut method on the user
      await stackUser?.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: redirect to Stack's logout handler
      window.location.href = '/handler/sign-out';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      logout,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
