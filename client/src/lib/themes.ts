// Enhanced Theme configuration with distinctive Material Design, Glassmorphism, and Bento styles
export const themes = {
  clasico: {
    id: "clasico",
    name: "Material Inca",
    description: "Material Design con influencias incaicas - Rojo Ayllu y Dorado Inti",
    gradient: "from-red-600 via-orange-500 to-yellow-500",
    primaryColor: "#dc2626", // Peru red
    style: "material",
    cssVariables: {
      "--theme-primary": "0 84% 60%", // Peru red
      "--theme-secondary": "45 93% 47%", // Peru gold
      "--theme-accent": "16 89% 58%", // Inca orange
      "--theme-tertiary": "25 95% 53%", // Warm orange
      "--theme-background": "45 15% 98%", // Warm white
      "--theme-surface": "45 25% 96%", // Light cream
      "--theme-elevated": "45 35% 94%", // Elevated cream
      "--theme-text": "20 15% 15%", // Dark brown
      "--theme-text-secondary": "20 10% 40%", // Medium brown
      "--theme-border": "45 20% 88%", // Soft border
      "--theme-sidebar": "45 40% 95%", // Warm sidebar
      "--theme-header": "0 84% 60%", // Red header
      "--theme-nav-hover": "45 93% 93%", // Gold hover
      "--theme-nav-active": "0 84% 92%", // Red active
      "--theme-shadow": "0 0% 0%", // Material shadows
      "--theme-glow": "45 93% 47%", // Gold glow
    },
    darkVariables: {
      "--theme-primary": "0 84% 65%",
      "--theme-secondary": "45 93% 55%",
      "--theme-accent": "16 89% 65%",
      "--theme-tertiary": "25 95% 60%",
      "--theme-background": "20 15% 8%", // Dark brown
      "--theme-surface": "20 15% 12%", // Dark surface
      "--theme-elevated": "20 15% 16%", // Elevated dark
      "--theme-text": "45 20% 95%", // Light cream
      "--theme-text-secondary": "45 15% 70%", // Medium cream
      "--theme-border": "20 10% 22%", // Dark border
      "--theme-sidebar": "20 15% 10%", // Dark sidebar
      "--theme-header": "20 15% 14%", // Dark header
      "--theme-nav-hover": "0 84% 20%", // Red hover
      "--theme-nav-active": "0 84% 25%", // Red active
      "--theme-shadow": "0 0% 0%", // Deep shadows
      "--theme-glow": "45 93% 55%", // Gold glow
    }
  },
  moderno: {
    id: "moderno",
    name: "Cristal Andino",
    description: "Glassmorphism inspirado en cristales andinos - Transparencias y efectos de vidrio",
    gradient: "from-cyan-400 via-blue-500 to-purple-600",
    primaryColor: "#0891b2", // Cyan
    style: "glassmorphism",
    cssVariables: {
      "--theme-primary": "188 94% 37%", // Glacier cyan
      "--theme-secondary": "217 91% 60%", // Sky blue
      "--theme-accent": "271 81% 65%", // Crystal purple
      "--theme-tertiary": "200 95% 55%", // Ice blue
      "--theme-background": "200 30% 98%", // Ice white
      "--theme-surface": "200 25% 96% / 0.7", // Glass surface
      "--theme-elevated": "200 20% 94% / 0.8", // Elevated glass
      "--theme-text": "200 20% 15%", // Deep blue-gray
      "--theme-text-secondary": "200 15% 45%", // Medium blue-gray
      "--theme-border": "200 30% 85% / 0.3", // Glass border
      "--theme-sidebar": "200 40% 97% / 0.85", // Glass sidebar
      "--theme-header": "188 94% 37% / 0.9", // Glass header
      "--theme-nav-hover": "200 40% 90% / 0.6", // Glass hover
      "--theme-nav-active": "188 94% 90% / 0.7", // Glass active
      "--theme-shadow": "200 50% 70%", // Colored shadows
      "--theme-glow": "188 94% 37%", // Cyan glow
      "--theme-blur": "12px", // Glass blur
      "--theme-frost": "0 0% 100% / 0.1", // Frost effect
    },
    darkVariables: {
      "--theme-primary": "188 94% 45%",
      "--theme-secondary": "217 91% 70%",
      "--theme-accent": "271 81% 75%",
      "--theme-tertiary": "200 95% 65%",
      "--theme-background": "200 30% 8%", // Dark ice
      "--theme-surface": "200 25% 12% / 0.7", // Dark glass
      "--theme-elevated": "200 20% 16% / 0.8", // Dark elevated
      "--theme-text": "200 20% 95%", // Light ice
      "--theme-text-secondary": "200 15% 75%", // Medium ice
      "--theme-border": "200 30% 25% / 0.3", // Dark glass border
      "--theme-sidebar": "200 40% 10% / 0.85", // Dark glass sidebar
      "--theme-header": "200 25% 14% / 0.9", // Dark glass header
      "--theme-nav-hover": "200 40% 20% / 0.6", // Dark glass hover
      "--theme-nav-active": "188 94% 25% / 0.7", // Dark glass active
      "--theme-shadow": "200 50% 30%", // Dark colored shadows
      "--theme-glow": "188 94% 45%", // Brighter cyan glow
      "--theme-blur": "16px", // Stronger blur
      "--theme-frost": "0 0% 100% / 0.05", // Subtle frost
    }
  },
  natural: {
    id: "natural",
    name: "Bento Amazónico",
    description: "Diseño Bento inspirado en la biodiversidad amazónica - Modular y orgánico",
    gradient: "from-emerald-500 via-green-600 to-teal-600",
    primaryColor: "#059669", // Emerald
    style: "bento",
    cssVariables: {
      "--theme-primary": "160 84% 39%", // Jungle green
      "--theme-secondary": "174 72% 41%", // Amazon teal
      "--theme-accent": "142 76% 36%", // Forest green
      "--theme-tertiary": "120 60% 45%", // Leaf green
      "--theme-background": "155 25% 97%", // Natural white
      "--theme-surface": "155 20% 95%", // Organic surface
      "--theme-elevated": "155 15% 92%", // Elevated natural
      "--theme-text": "155 30% 15%", // Deep forest
      "--theme-text-secondary": "155 20% 40%", // Forest gray
      "--theme-border": "155 25% 85%", // Natural border
      "--theme-sidebar": "155 30% 94%", // Natural sidebar
      "--theme-header": "160 84% 39%", // Green header
      "--theme-nav-hover": "155 40% 88%", // Natural hover
      "--theme-nav-active": "160 84% 88%", // Green active
      "--theme-shadow": "155 30% 60%", // Natural shadows
      "--theme-glow": "160 84% 39%", // Green glow
      "--theme-radius-sm": "8px", // Bento small radius
      "--theme-radius-md": "16px", // Bento medium radius
      "--theme-radius-lg": "24px", // Bento large radius
      "--theme-grid-gap": "16px", // Bento grid spacing
    },
    darkVariables: {
      "--theme-primary": "160 84% 45%",
      "--theme-secondary": "174 72% 50%",
      "--theme-accent": "142 76% 45%",
      "--theme-tertiary": "120 60% 55%",
      "--theme-background": "155 25% 8%", // Dark jungle
      "--theme-surface": "155 20% 12%", // Dark organic
      "--theme-elevated": "155 15% 16%", // Dark elevated
      "--theme-text": "155 30% 95%", // Light natural
      "--theme-text-secondary": "155 20% 75%", // Light forest
      "--theme-border": "155 25% 25%", // Dark natural border
      "--theme-sidebar": "155 30% 10%", // Dark natural sidebar
      "--theme-header": "155 20% 14%", // Dark header
      "--theme-nav-hover": "155 40% 18%", // Dark natural hover
      "--theme-nav-active": "160 84% 20%", // Dark green active
      "--theme-shadow": "155 30% 5%", // Deep natural shadows
      "--theme-glow": "160 84% 45%", // Brighter green glow
      "--theme-radius-sm": "8px",
      "--theme-radius-md": "16px",
      "--theme-radius-lg": "24px",
      "--theme-grid-gap": "16px",
    }
  },
  brutalist: {
    id: "brutalist",
    name: "Neo-Brutal Inca",
    description: "Neo-Brutalism con actitud peruana - Bordes gruesos, contrastes extremos y tipografía cruda",
    gradient: "from-yellow-400 via-red-600 to-black",
    primaryColor: "#dc2626", // Bold red
    style: "neobrutalism",
    cssVariables: {
      "--theme-primary": "0 84% 60%", // Brutal red
      "--theme-secondary": "45 93% 55%", // Brutal yellow
      "--theme-accent": "0 0% 0%", // Pure black
      "--theme-tertiary": "120 100% 50%", // Brutal green
      "--theme-background": "0 0% 98%", // Off-white
      "--theme-surface": "0 0% 95%", // Light gray surface
      "--theme-elevated": "0 0% 92%", // Elevated gray
      "--theme-text": "0 0% 0%", // Pure black text
      "--theme-text-secondary": "0 0% 20%", // Dark gray
      "--theme-border": "0 0% 0%", // Black borders
      "--theme-sidebar": "45 93% 55%", // Yellow sidebar
      "--theme-header": "0 84% 60%", // Red header
      "--theme-nav-hover": "0 0% 85%", // Gray hover
      "--theme-nav-active": "0 84% 60%", // Red active
      "--theme-shadow": "0 0% 0%", // Harsh black shadows
      "--theme-glow": "45 93% 55%", // Yellow glow
      "--theme-border-width": "4px", // Thick borders
      "--theme-shadow-brutal": "6px 6px 0px", // Harsh drop shadow
    },
    darkVariables: {
      "--theme-primary": "0 84% 65%",
      "--theme-secondary": "45 93% 60%",
      "--theme-accent": "0 0% 100%", // Pure white in dark
      "--theme-tertiary": "120 100% 60%",
      "--theme-background": "0 0% 8%", // Dark background
      "--theme-surface": "0 0% 12%", // Dark surface
      "--theme-elevated": "0 0% 16%", // Dark elevated
      "--theme-text": "0 0% 100%", // Pure white text
      "--theme-text-secondary": "0 0% 80%", // Light gray
      "--theme-border": "0 0% 100%", // White borders in dark
      "--theme-sidebar": "0 0% 10%", // Dark sidebar
      "--theme-header": "0 0% 12%", // Dark header
      "--theme-nav-hover": "0 0% 20%", // Dark hover
      "--theme-nav-active": "0 84% 65%", // Red active
      "--theme-shadow": "0 0% 0%", // Black shadows
      "--theme-glow": "45 93% 60%", // Brighter yellow glow
      "--theme-border-width": "4px",
      "--theme-shadow-brutal": "6px 6px 0px",
    }
  }
};

export type ThemeId = keyof typeof themes;

export const applyTheme = (themeId: ThemeId, isDark: boolean = false, isDashboard: boolean = false) => {
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
  
  // Apply theme-specific body classes only for dashboard
  if (isDashboard) {
    // Remove all theme classes first
    root.classList.remove('theme-material', 'theme-glassmorphism', 'theme-bento');
    
    // Add appropriate theme class
    switch (theme.style) {
      case 'material':
        root.classList.add('theme-material');
        break;
      case 'glassmorphism':
        root.classList.add('theme-glassmorphism');
        break;
      case 'bento':
        root.classList.add('theme-bento');
        break;
      case 'neobrutalism':
        root.classList.add('theme-neobrutalism');
        break;
    }
  } else {
    // Remove theme classes for public pages
    root.classList.remove('theme-material', 'theme-glassmorphism', 'theme-bento', 'theme-neobrutalism');
  }
  
  // Store theme preference
  localStorage.setItem('selectedTheme', themeId);
  
  console.log(`Applied theme: ${themeId} (${isDark ? 'dark' : 'light'}) - Dashboard: ${isDashboard}`);
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
