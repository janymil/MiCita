import { stackClientApp } from "../../../stack/client";

export { stackClientApp };

export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const result = await stackClientApp.signInWithCredential({
      email: credentials.email,
      password: credentials.password,
    });
    
    if (!result.user) {
      throw new Error('Login failed');
    }
    
    return {
      id: result.user.id,
      email: result.user.primaryEmail || '',
      displayName: result.user.displayName,
    };
  },

  register: async (userData: RegisterData): Promise<User> => {
    const result = await stackClientApp.signUpWithCredential({
      email: userData.email,
      password: userData.password,
    });
    
    if (!result.user) {
      throw new Error('Registration failed');
    }

    // Update display name if provided
    if (userData.displayName) {
      await result.user.update({
        displayName: userData.displayName,
      });
    }
    
    return {
      id: result.user.id,
      email: result.user.primaryEmail || '',
      displayName: result.user.displayName || userData.displayName,
    };
  },

  logout: async (): Promise<void> => {
    await stackClientApp.signOut();
  },

  getCurrentUser: (): User | null => {
    const user = stackClientApp.getUser();
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.primaryEmail || '',
      displayName: user.displayName,
    };
  }
};
