import { MicrositeTheme } from '@/contexts/MicrositeThemeContext';

export interface ThemeConfig {
  name: string;
  description: string;
  layout: 'traditional' | 'bento' | 'sidebar' | 'masonry';
  background: string;
  card: string;
  header: string;
  button: string;
  accent: string;
  text: string;
  border: string;
  shadow: string;
  effects: string;
  special: string;
}

export const micrositeThemes: Record<MicrositeTheme, ThemeConfig> = {
  glassmorphism: {
    name: 'Glassmorphism Moderno',
    description: 'Diseño limpio con transparencias y gradientes suaves',
    layout: 'traditional',
    background: 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50',
    card: 'bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl hover:bg-white/70',
    header: 'bg-white/40 backdrop-blur-2xl border-b border-white/30 shadow-lg',
    button: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20',
    accent: 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/50',
    text: 'text-slate-800',
    border: 'border-white/20',
    shadow: 'shadow-2xl hover:shadow-3xl',
    effects: 'transition-all duration-500 hover:scale-[1.02] hover:rotate-1',
    special: 'backdrop-blur-xl bg-gradient-to-br from-white/50 to-white/30'
  },
  
  brutalist: {
    name: 'Neo-Brutalism Radical',
    description: 'Diseño crudo con bordes gruesos y contrastes extremos',
    layout: 'masonry',
    background: 'bg-black text-white relative overflow-hidden',
    card: 'bg-white text-black border-8 border-black shadow-[16px_16px_0px_0px_#ff0000] hover:shadow-[24px_24px_0px_0px_#ff0000] skew-y-1 hover:skew-y-0',
    header: 'bg-yellow-400 border-b-8 border-black shadow-[0px_16px_0px_0px_#ff0000] transform -skew-x-2',
    button: 'bg-red-500 hover:bg-green-500 text-white border-8 border-black shadow-[8px_8px_0px_0px_#ffff00] hover:shadow-[12px_12px_0px_0px_#ffff00] font-black uppercase text-xl tracking-wider',
    accent: 'bg-cyan-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_#ff00ff]',
    text: 'text-black font-black uppercase tracking-wide',
    border: 'border-8 border-black',
    shadow: 'shadow-[16px_16px_0px_0px_#ff0000] hover:shadow-[24px_24px_0px_0px_#ff0000]',
    effects: 'transition-all duration-100 transform hover:translate-x-2 hover:translate-y-2 hover:rotate-1',
    special: 'relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-red-500/20 before:to-yellow-500/20 before:z-[-1]'
  },
  
  'retro-futurism': {
    name: 'Cyberpunk Retro',
    description: 'Estética cyberpunk retro con neones y efectos holográficos',
    layout: 'sidebar',
    background: 'bg-black relative overflow-hidden before:absolute before:inset-0 before:bg-[url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%2300ffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] before:animate-pulse',
    card: 'bg-gray-900/90 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] backdrop-blur-sm relative overflow-hidden',
    header: 'bg-gray-900/95 border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md relative',
    button: 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-pink-500 hover:to-cyan-500 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.7)] border-2 border-cyan-400 uppercase tracking-widest',
    accent: 'bg-cyan-400/10 border-2 border-cyan-400/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]',
    text: 'text-cyan-100 font-mono',
    border: 'border-2 border-cyan-400',
    shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)]',
    effects: 'transition-all duration-300 hover:scale-105 hover:brightness-125 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-cyan-400/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
    special: 'relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyan-500/10 before:to-pink-500/10 before:z-[-1] after:absolute after:inset-0 after:shadow-[inset_0_0_20px_rgba(6,182,212,0.3)] after:pointer-events-none'
  },
  
  'bento-grid': {
    name: 'Bento Minimalista',
    description: 'Layout modular limpio inspirado en cajas bento japonesas',
    layout: 'bento',
    background: 'bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50',
    card: 'bg-white border-2 border-stone-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-orange-300',
    header: 'bg-white/98 border-b-2 border-stone-200 backdrop-blur-sm',
    button: 'bg-orange-500 hover:bg-amber-500 text-white rounded-2xl shadow-sm hover:shadow-lg font-medium py-4 px-8',
    accent: 'bg-orange-50 border-2 border-orange-200 rounded-2xl',
    text: 'text-stone-800 font-medium',
    border: 'border-2 border-stone-200 rounded-3xl',
    shadow: 'shadow-sm hover:shadow-xl',
    effects: 'transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1',
    special: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-100/50 before:to-amber-100/50 before:rounded-3xl before:z-[-1]'
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