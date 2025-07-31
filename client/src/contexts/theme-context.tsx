import React, { createContext, useContext, useState, useEffect } from "react";
import { applyTheme, getCurrentTheme, getCurrentPrimaryColor, applyPrimaryColor, type ThemeId } from "@/lib/themes";
import { stackClientApp } from "../../../stack/client";

interface ThemeContextType {
  isDark: boolean;
  currentTheme: ThemeId;
  primaryColor: string;
  isLoading: boolean;
  toggleTheme: () => void;
  setTheme: (themeId: ThemeId) => void;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('clasico');
  const [primaryColor, setPrimaryColorState] = useState('#dc2626');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user preferences from API
    const loadUserPreferences = async () => {
      try {
        // Get Stack Auth token for authenticated requests
        const headers: HeadersInit = {};
        try {
          const user = await stackClientApp.getUser();
          if (user) {
            const { accessToken } = await user.getAuthJson();
            if (accessToken) {
              headers["x-stack-access-token"] = accessToken;
            }
          }
        } catch (error) {
          console.log('No authenticated user for theme preferences');
        }

        const response = await fetch('/api/user/preferences', {
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const prefs = await response.json();
          const themeId = (prefs.dashboardTheme || 'clasico') as ThemeId;
          const color = prefs.primaryColor || '#dc2626';
          const dark = prefs.isDarkMode || false;
          
          setCurrentTheme(themeId);
          setPrimaryColorState(color);
          setIsDark(dark);
          
          // Apply theme to DOM
          if (dark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          
          applyTheme(themeId, dark);
          applyPrimaryColor(color);
        } else {
          // Fall back to localStorage if API fails
          const savedTheme = localStorage.getItem("theme");
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const storedTheme = getCurrentTheme();
          const storedColor = getCurrentPrimaryColor();
          
          if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add("dark");
          }
          
          setCurrentTheme(storedTheme);
          setPrimaryColorState(storedColor);
          applyTheme(storedTheme, savedTheme === "dark" || (!savedTheme && prefersDark));
          applyPrimaryColor(storedColor);
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
        // Fall back to localStorage
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        
        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
          setIsDark(true);
          document.documentElement.classList.add("dark");
        }
        
        applyTheme('clasico', savedTheme === "dark" || (!savedTheme && prefersDark));
        applyPrimaryColor('#dc2626');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, []);

  const savePreferences = async (theme: ThemeId, color: string, dark: boolean) => {
    try {
      // Get Stack Auth token for authenticated requests
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      try {
        const user = await stackClientApp.getUser();
        if (user) {
          const { accessToken } = await user.getAuthJson();
          if (accessToken) {
            headers["x-stack-access-token"] = accessToken;
          }
        }
      } catch (error) {
        console.log('No authenticated user for saving theme preferences');
      }

      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          dashboardTheme: theme,
          primaryColor: color,
          isDarkMode: dark,
        }),
      });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      // Fall back to localStorage
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("primaryColor", color);
      localStorage.setItem("currentTheme", theme);
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Reapply theme with new dark mode setting
    applyTheme(currentTheme, newIsDark);
    
    // Save to database
    savePreferences(currentTheme, primaryColor, newIsDark);
  };

  const setTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId, isDark);
    
    // Save to database
    savePreferences(themeId, primaryColor, isDark);
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    applyPrimaryColor(color);
    
    // Save to database
    savePreferences(currentTheme, color, isDark);
  };

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      currentTheme, 
      primaryColor, 
      isLoading,
      toggleTheme, 
      setTheme, 
      setPrimaryColor 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
