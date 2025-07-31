import { MicrositeTheme } from '@/contexts/MicrositeThemeContext';

export interface ThemeConfig {
  name: string;
  description: string;
  background: string;
  card: string;
  header: string;
  button: string;
  accent: string;
  text: string;
  border: string;
  shadow: string;
  effects: string;
}

export const micrositeThemes: Record<MicrositeTheme, ThemeConfig> = {
  glassmorphism: {
    name: 'Glassmorphism',
    description: 'Modern glass-like transparency with soft gradients',
    background: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    card: 'bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl',
    header: 'bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50',
    button: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105',
    accent: 'bg-gradient-to-r from-blue-50 to-purple-50',
    text: 'text-gray-900',
    border: 'border-gray-200/50',
    shadow: 'shadow-lg hover:shadow-xl',
    effects: 'transition-all duration-300 group'
  },
  
  brutalist: {
    name: 'Neo-Brutalism',
    description: 'Bold, raw design with strong contrasts and thick borders',
    background: 'bg-black text-white',
    card: 'bg-white text-black border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000]',
    header: 'bg-yellow-400 border-b-4 border-black shadow-[0px_8px_0px_0px_#000]',
    button: 'bg-red-500 hover:bg-red-600 text-white border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] font-bold uppercase',
    accent: 'bg-yellow-400 text-black border-2 border-black',
    text: 'text-black font-bold',
    border: 'border-4 border-black',
    shadow: 'shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000]',
    effects: 'transition-all duration-200 transform hover:translate-x-1 hover:translate-y-1'
  },
  
  'retro-futurism': {
    name: 'Retro Futurism',
    description: 'Cyberpunk-inspired with neon colors and grid patterns',
    background: 'bg-gradient-to-br from-purple-900 via-gray-900 to-black',
    card: 'bg-gray-900/80 border border-cyan-400/50 shadow-lg shadow-cyan-400/20 backdrop-blur-sm hover:shadow-cyan-400/40',
    header: 'bg-gray-900/90 border-b border-cyan-400/50 shadow-lg shadow-cyan-400/20 backdrop-blur-md',
    button: 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-400/30 border border-cyan-400/50',
    accent: 'bg-cyan-400/20 border border-cyan-400/50',
    text: 'text-cyan-100',
    border: 'border-cyan-400/50',
    shadow: 'shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40',
    effects: 'transition-all duration-300 hover:scale-105 hover:brightness-110'
  },
  
  'bento-grid': {
    name: 'Bento Grid',
    description: 'Clean modular layout inspired by Japanese bento boxes',
    background: 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50',
    card: 'bg-white border border-orange-200 rounded-2xl shadow-sm hover:shadow-md',
    header: 'bg-white/95 border-b border-orange-200 backdrop-blur-sm',
    button: 'bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm hover:shadow-md',
    accent: 'bg-orange-100 border border-orange-200 rounded-xl',
    text: 'text-gray-800',
    border: 'border-orange-200 rounded-2xl',
    shadow: 'shadow-sm hover:shadow-md',
    effects: 'transition-all duration-200 hover:scale-[1.02]'
  }
};

export const getThemeClasses = (theme: MicrositeTheme) => {
  return micrositeThemes[theme];
};

// Theme-specific CSS variables to be injected
export const getThemeCSSVariables = (theme: MicrositeTheme) => {
  const themes: Record<MicrositeTheme, Record<string, string>> = {
    glassmorphism: {
      '--theme-primary': '239 68 68', // red-500
      '--theme-secondary': '156 163 175', // gray-400
      '--theme-accent': '59 130 246', // blue-500
      '--theme-background': '249 250 251', // gray-50
    },
    brutalist: {
      '--theme-primary': '239 68 68', // red-500
      '--theme-secondary': '251 191 36', // yellow-400
      '--theme-accent': '0 0 0', // black
      '--theme-background': '0 0 0', // black
    },
    'retro-futurism': {
      '--theme-primary': '34 211 238', // cyan-400
      '--theme-secondary': '147 51 234', // purple-600
      '--theme-accent': '6 182 212', // cyan-500
      '--theme-background': '17 24 39', // gray-900
    },
    'bento-grid': {
      '--theme-primary': '249 115 22', // orange-500
      '--theme-secondary': '245 158 11', // amber-500
      '--theme-accent': '251 191 36', // yellow-400
      '--theme-background': '255 251 235', // orange-50
    }
  };
  
  return themes[theme];
};