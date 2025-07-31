import React, { createContext, useContext, useState, useEffect } from 'react';

export type MicrositeTheme = 'glassmorphism' | 'brutalist' | 'retro-futurism' | 'bento-grid';

interface MicrositeThemeContextType {
  theme: MicrositeTheme;
  setTheme: (theme: MicrositeTheme) => void;
  isDashboard: boolean;
}

const MicrositeThemeContext = createContext<MicrositeThemeContextType | undefined>(undefined);

export const MicrositeThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<MicrositeTheme>('glassmorphism');
  const [isDashboard, setIsDashboard] = useState(false);

  useEffect(() => {
    // Check if we're on a dashboard page
    const isDashboardPage = window.location.pathname.startsWith('/dashboard');
    setIsDashboard(isDashboardPage);

    // Load saved theme from localStorage for microsites only (not dashboard)
    if (!isDashboardPage) {
      const savedTheme = localStorage.getItem('microsite-theme') as MicrositeTheme;
      if (savedTheme && ['glassmorphism', 'brutalist', 'retro-futurism', 'bento-grid'].includes(savedTheme)) {
        setTheme(savedTheme);
      }
    }
  }, []);

  const handleSetTheme = (newTheme: MicrositeTheme) => {
    setTheme(newTheme);
    // Only save to localStorage for microsites, not dashboard
    if (!isDashboard) {
      localStorage.setItem('microsite-theme', newTheme);
    }
  };

  return (
    <MicrositeThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDashboard }}>
      {children}
    </MicrositeThemeContext.Provider>
  );
};

export const useMicrositeTheme = () => {
  const context = useContext(MicrositeThemeContext);
  if (context === undefined) {
    throw new Error('useMicrositeTheme must be used within a MicrositeThemeProvider');
  }
  return context;
};