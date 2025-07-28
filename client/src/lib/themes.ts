// Theme configuration with actual CSS variables and styles
export const themes = {
  clasico: {
    id: "clasico",
    name: "Clásico Peruano",
    description: "Colores tradicionales del Perú - Rojo y Dorado",
    gradient: "from-red-600 to-yellow-500",
    primaryColor: "#dc2626", // Red
    cssVariables: {
      "--theme-primary": "0 84% 60%", // Peru red
      "--theme-secondary": "45 93% 47%", // Peru gold
      "--theme-accent": "0 84% 60%",
      "--theme-background": "0 0% 100%",
      "--theme-surface": "45 33% 98%",
      "--theme-text": "0 0% 9%",
      "--theme-border": "45 20% 85%",
      "--theme-sidebar": "45 33% 98%",
      "--theme-header": "0 84% 60%",
      "--theme-nav-hover": "45 93% 95%",
      "--theme-nav-active": "0 84% 95%",
    },
    darkVariables: {
      "--theme-primary": "0 84% 60%",
      "--theme-secondary": "45 93% 47%",
      "--theme-accent": "0 84% 65%",
      "--theme-background": "0 0% 9%",
      "--theme-surface": "0 0% 14%",
      "--theme-text": "0 0% 98%",
      "--theme-border": "0 0% 20%",
      "--theme-sidebar": "0 0% 11%",
      "--theme-header": "0 0% 14%",
      "--theme-nav-hover": "0 84% 15%",
      "--theme-nav-active": "0 84% 20%",
    }
  },
  moderno: {
    id: "moderno",
    name: "Moderno",
    description: "Diseño contemporáneo - Azul y Violeta",
    gradient: "from-blue-600 to-purple-600",
    primaryColor: "#2563eb", // Blue
    cssVariables: {
      "--theme-primary": "217 91% 60%", // Modern blue
      "--theme-secondary": "271 81% 56%", // Modern purple
      "--theme-accent": "217 91% 60%",
      "--theme-background": "0 0% 100%",
      "--theme-surface": "217 33% 97%",
      "--theme-text": "217 19% 9%",
      "--theme-border": "217 20% 85%",
      "--theme-sidebar": "217 33% 97%",
      "--theme-header": "217 91% 60%",
      "--theme-nav-hover": "217 91% 95%",
      "--theme-nav-active": "217 91% 90%",
    },
    darkVariables: {
      "--theme-primary": "217 91% 60%",
      "--theme-secondary": "271 81% 56%",
      "--theme-accent": "217 91% 65%",
      "--theme-background": "217 19% 9%",
      "--theme-surface": "217 19% 14%",
      "--theme-text": "0 0% 98%",
      "--theme-border": "217 19% 20%",
      "--theme-sidebar": "217 19% 11%",
      "--theme-header": "217 19% 14%",
      "--theme-nav-hover": "217 91% 15%",
      "--theme-nav-active": "217 91% 20%",
    }
  },
  natural: {
    id: "natural",
    name: "Natural",
    description: "Inspirado en la naturaleza - Verde y Azul",
    gradient: "from-green-600 to-emerald-500",
    primaryColor: "#059669", // Green
    cssVariables: {
      "--theme-primary": "160 84% 39%", // Natural green
      "--theme-secondary": "158 64% 52%", // Emerald
      "--theme-accent": "160 84% 39%",
      "--theme-background": "0 0% 100%",
      "--theme-surface": "160 33% 97%",
      "--theme-text": "160 19% 9%",
      "--theme-border": "160 20% 85%",
      "--theme-sidebar": "160 33% 97%",
      "--theme-header": "160 84% 39%",
      "--theme-nav-hover": "160 84% 95%",
      "--theme-nav-active": "160 84% 90%",
    },
    darkVariables: {
      "--theme-primary": "160 84% 39%",
      "--theme-secondary": "158 64% 52%",
      "--theme-accent": "160 84% 45%",
      "--theme-background": "160 19% 9%",
      "--theme-surface": "160 19% 14%",
      "--theme-text": "0 0% 98%",
      "--theme-border": "160 19% 20%",
      "--theme-sidebar": "160 19% 11%",
      "--theme-header": "160 19% 14%",
      "--theme-nav-hover": "160 84% 15%",
      "--theme-nav-active": "160 84% 20%",
    }
  }
};

export type ThemeId = keyof typeof themes;

export const applyTheme = (themeId: ThemeId, isDark: boolean = false) => {
  const theme = themes[themeId];
  if (!theme) return;

  const variables = isDark ? theme.darkVariables : theme.cssVariables;
  const root = document.documentElement;

  // Apply theme variables
  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Also update the primary color to match theme
  const primaryHsl = variables["--theme-primary"];
  root.style.setProperty('--primary', primaryHsl);
  
  // Store theme preference
  localStorage.setItem('selectedTheme', themeId);
  
  console.log(`Applied theme: ${themeId} (${isDark ? 'dark' : 'light'})`);
};

export const applyPrimaryColor = (color: string) => {
  const root = document.documentElement;
  
  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }

    return [Math.round(h! * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const [h, s, l] = hexToHsl(color);
  
  // Apply primary color variations
  root.style.setProperty('--theme-primary', `${h} ${s}% ${l}%`);
  root.style.setProperty('--theme-accent', `${h} ${s}% ${Math.min(l + 10, 100)}%`);
  root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
  
  // Store color preference
  localStorage.setItem('primaryColor', color);
};

export const getCurrentTheme = (): ThemeId => {
  return (localStorage.getItem('selectedTheme') as ThemeId) || 'clasico';
};

export const getCurrentPrimaryColor = (): string => {
  const savedColor = localStorage.getItem('primaryColor');
  if (savedColor) return savedColor;
  
  // Return default color based on current theme
  const currentTheme = getCurrentTheme();
  const theme = themes[currentTheme];
  return theme?.primaryColor || themes.clasico.primaryColor;
};
