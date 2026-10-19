import React, { createContext, useContext, useState, useEffect } from "react";
import { applyTheme, getCurrentTheme, getCurrentPrimaryColor, applyPrimaryColor, type ThemeId } from "@/lib/themes";
import { apiFetch } from "@/lib/auth-api";

interface ThemeContextType {
  isDark: boolean;
  currentTheme: ThemeId;
  primaryColor: string;
  isLoading: boolean;
  isDashboard: boolean;
  toggleTheme: () => void;
  setTheme: (themeId: ThemeId) => void;
  setPrimaryColor: (color: string) => void;
  setIsDashboard: (isDashboard: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('clasico');
  const [primaryColor, setPrimaryColorState] = useState('#C13A2E');
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboard, setIsDashboard] = useState(false);

  useEffect(() => {
    // Load user preferences from API
    const loadUserPreferences = async () => {
      try {
        const response = await apiFetch('/api/user/preferences', { method: 'GET' });
        
        if (response.ok) {
          const prefs = await response.json();
          const themeId = (prefs.dashboardTheme || 'clasico') as ThemeId;
          const color = prefs.primaryColor || '#C13A2E';
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
          
          applyTheme(themeId, dark, isDashboard);
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
          applyTheme(storedTheme, savedTheme === "dark" || (!savedTheme && prefersDark), isDashboard);
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
        
        applyTheme('clasico', savedTheme === "dark" || (!savedTheme && prefersDark), isDashboard);
        applyPrimaryColor('#C13A2E');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, []);

  const savePreferences = async (theme: ThemeId, color: string, dark: boolean) => {
    try {
      await apiFetch('/api/user/preferences', {
        method: 'PUT',
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
    
    // Force a complete style recalculation
    const root = document.documentElement;
    root.classList.remove('theme-material', 'theme-glassmorphism', 'theme-bento', 'theme-neobrutalism');
    void root.offsetHeight;
    
    // Reapply theme with new dark mode setting
    applyTheme(currentTheme, newIsDark, isDashboard);
    
    // Save to database
    savePreferences(currentTheme, primaryColor, newIsDark);
  };

  const setTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    
    // Force a complete style recalculation by removing all theme classes first
    const root = document.documentElement;
    root.classList.remove('theme-material', 'theme-glassmorphism', 'theme-bento', 'theme-neobrutalism');
    
    // Force a reflow to ensure styles are cleared
    void root.offsetHeight;
    
    applyTheme(themeId, isDark, isDashboard);
    
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
      isDashboard,
      toggleTheme, 
      setTheme, 
      setPrimaryColor,
      setIsDashboard
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
