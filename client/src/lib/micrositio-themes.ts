// Micrositio Frontend Theme System
// 4 Modern Themes for Business Microsites

export type MicrositioThemeId = 'moderno' | 'flat' | 'glassmorphism' | 'cyberpunk';

export interface MicrositioTheme {
  id: MicrositioThemeId;
  name: string;
  description: string;
  style: string;
  cssVariables: Record<string, string>;
}

export const micrositioThemes: Record<MicrositioThemeId, MicrositioTheme> = {
  moderno: {
    id: "moderno",
    name: "Moderno Elegante",
    description: "Diseño contemporáneo con gradientes suaves y efectos glassmorphism ligeros",
    style: "modern",
    cssVariables: {
      "--micrositio-bg": "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      "--micrositio-card-bg": "rgba(255, 255, 255, 0.8)",
      "--micrositio-card-border": "rgba(226, 232, 240, 0.5)",
      "--micrositio-card-shadow": "0 8px 32px rgba(0, 0, 0, 0.1)",
      "--micrositio-text-primary": "#1e293b",
      "--micrositio-text-secondary": "#64748b",
      "--micrositio-accent": "#3b82f6",
      "--micrositio-accent-hover": "#2563eb",
      "--micrositio-border-radius": "16px",
      "--micrositio-backdrop-blur": "blur(16px)",
    }
  },
  flat: {
    id: "flat",
    name: "Flat Design",
    description: "Diseño plano minimalista con colores sólidos y sin sombras",
    style: "flat",
    cssVariables: {
      "--micrositio-bg": "#ffffff",
      "--micrositio-card-bg": "#f8f9fa",
      "--micrositio-card-border": "#e9ecef",
      "--micrositio-card-shadow": "none",
      "--micrositio-text-primary": "#212529",
      "--micrositio-text-secondary": "#6c757d",
      "--micrositio-accent": "#007bff",
      "--micrositio-accent-hover": "#0056b3",
      "--micrositio-border-radius": "8px",
      "--micrositio-backdrop-blur": "none",
    }
  },
  glassmorphism: {
    id: "glassmorphism",
    name: "Glassmorphism",
    description: "Efecto de vidrio con transparencias y desenfoque de fondo",
    style: "glassmorphism",
    cssVariables: {
      "--micrositio-bg": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "--micrositio-card-bg": "rgba(255, 255, 255, 0.15)",
      "--micrositio-card-border": "rgba(255, 255, 255, 0.2)",
      "--micrositio-card-shadow": "0 8px 32px rgba(0, 0, 0, 0.1)",
      "--micrositio-text-primary": "#ffffff",
      "--micrositio-text-secondary": "rgba(255, 255, 255, 0.8)",
      "--micrositio-accent": "#f59e0b",
      "--micrositio-accent-hover": "#d97706",
      "--micrositio-border-radius": "20px",
      "--micrositio-backdrop-blur": "blur(20px)",
    }
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Futurista con colores neón, fondos oscuros y elementos brillantes",
    style: "cyberpunk",
    cssVariables: {
      "--micrositio-bg": "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
      "--micrositio-card-bg": "rgba(0, 255, 255, 0.05)",
      "--micrositio-card-border": "#00ffff",
      "--micrositio-card-shadow": "0 0 20px rgba(0, 255, 255, 0.3)",
      "--micrositio-text-primary": "#ffffff",
      "--micrositio-text-secondary": "#00ffff",
      "--micrositio-accent": "#ff0080",
      "--micrositio-accent-hover": "#ff3399",
      "--micrositio-border-radius": "4px",
      "--micrositio-backdrop-blur": "none",
    }
  }
};

export function applyMicrositioTheme(themeId: MicrositioThemeId) {
  const theme = micrositioThemes[themeId];
  if (!theme) return;

  const root = document.documentElement;
  
  // Remove all existing theme classes
  root.classList.remove('micrositio-modern', 'micrositio-flat', 'micrositio-glassmorphism', 'micrositio-cyberpunk');
  
  // Apply theme CSS variables
  Object.entries(theme.cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Add theme-specific class
  root.classList.add(`micrositio-${theme.style}`);
  
  console.log(`Applied micrositio theme: ${theme.name}`);
}

export function getMicrositioTheme(themeId: MicrositioThemeId): MicrositioTheme {
  return micrositioThemes[themeId] || micrositioThemes.moderno;
}