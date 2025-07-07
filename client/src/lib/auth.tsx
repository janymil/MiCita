import { apiRequest } from "./queryClient";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();
    return data.user;
  },

  register: async (userData: RegisterData): Promise<User> => {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    const data = await response.json();
    return data.user;
  },

  logout: async (): Promise<void> => {
    // Clear local storage in the context
    localStorage.removeItem("auth-user");
  }
};
