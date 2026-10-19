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
  micita: {
    name: 'Atardecer Andino (Marca MiCita)',
    description: 'La identidad oficial de MiCita: crema cálido, Rojo Manta y Oro Inti con tipografía editorial moderna',
    layout: 'traditional',
    background: 'bg-[#FAF7F2] text-neutral-900 selection:bg-red-500/10 selection:text-red-600',
    card: 'bg-white/95 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl transition-all duration-300',
    header: 'bg-[#FAF7F2]/90 backdrop-blur-xl border-b border-black/[0.06] shadow-sm',
    button: 'brand-btn-primary font-semibold border-0 text-white rounded-2xl shadow-sm hover:shadow-md',
    accent: 'bg-[hsl(38_85%_95%)] text-neutral-900 rounded-2xl',
    text: 'text-neutral-900',
    border: 'rounded-3xl',
    shadow: 'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]',
    effects: 'transition-all duration-300',
    special: 'relative'
  },

  glassmorphism: {
    name: 'Glassmorphism Moderno',
    description: 'Diseño limpio con transparencias, blur de cristal y gradientes suaves',
    layout: 'traditional',
    background: 'bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/70 text-slate-800 selection:bg-indigo-500/15 selection:text-indigo-700',
    card: 'bg-white/75 backdrop-blur-2xl shadow-xl rounded-3xl border border-white/60 transition-all duration-300',
    header: 'bg-white/60 backdrop-blur-2xl border-b border-white/40 shadow-sm',
    button: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-indigo-500/25',
    accent: 'bg-white/60 border border-white/40 rounded-2xl text-indigo-950',
    text: 'text-slate-800',
    border: 'border border-white/40 rounded-3xl',
    shadow: 'shadow-2xl',
    effects: 'transition-all duration-300 backdrop-blur-xl',
    special: 'backdrop-blur-xl bg-gradient-to-br from-white/50 to-white/30'
  },

  brutalist: {
    name: 'Neo-Brutalism Bold',
    description: 'Diseño audaz con bordes contrastantes, sombras sólidas y estética pop contemporánea',
    layout: 'masonry',
    background: 'bg-[#FEFCE8] text-black selection:bg-black selection:text-yellow-300',
    card: 'bg-white text-black border-4 border-black shadow-[6px_6px_0px_0px_#000] rounded-2xl transition-all duration-150',
    header: 'bg-[#FDE047] border-b-4 border-black shadow-[0_4px_0_0_#000]',
    button: 'bg-red-500 hover:bg-black text-white border-4 border-black shadow-[4px_4px_0_0_#000] font-black uppercase tracking-wide rounded-xl transition-all hover:translate-x-0.5 hover:translate-y-0.5',
    accent: 'bg-cyan-300 border-2 border-black rounded-xl text-black',
    text: 'text-black',
    border: 'border-4 border-black rounded-2xl',
    shadow: 'shadow-[6px_6px_0px_0px_#000]',
    effects: 'transition-all duration-150',
    special: 'relative'
  },

  'retro-futurism': {
    name: 'Cyberpunk Retro',
    description: 'Estética futurista nocturna con tonos neón cian/magenta y efecto holográfico',
    layout: 'sidebar',
    background: 'bg-[#0B0F19] text-cyan-50 selection:bg-cyan-500/20 selection:text-cyan-300',
    card: 'bg-[#111827]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)] rounded-3xl backdrop-blur-xl text-cyan-50 transition-all duration-300',
    header: 'bg-[#0B0F19]/90 border-b border-cyan-500/30 backdrop-blur-xl shadow-[0_4px_20px_rgba(6,182,212,0.1)]',
    button: 'bg-gradient-to-r from-cyan-400 to-pink-500 hover:from-cyan-300 hover:to-pink-400 text-black font-bold uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)]',
    accent: 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded-2xl',
    text: 'text-cyan-50',
    border: 'border border-cyan-500/30 rounded-3xl',
    shadow: 'shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    effects: 'transition-all duration-300',
    special: 'relative'
  },

  'bento-grid': {
    name: 'Bento Minimalista',
    description: 'Layout modular limpio inspirado en cajas bento con tonos cálidos y orgánicos',
    layout: 'bento',
    background: 'bg-[#F7F5F0] text-stone-900 selection:bg-orange-500/10 selection:text-orange-700',
    card: 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-stone-900/5 rounded-3xl transition-all duration-300',
    header: 'bg-[#F7F5F0]/90 backdrop-blur-xl border-b border-stone-200/70 shadow-sm',
    button: 'bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-2xl shadow-sm hover:shadow-orange-600/20',
    accent: 'bg-orange-50 text-stone-900 rounded-2xl',
    text: 'text-stone-900',
    border: 'ring-1 ring-stone-900/5 rounded-3xl',
    shadow: 'shadow-sm',
    effects: 'transition-all duration-300',
    special: 'relative'
  }
};

export const getThemeClasses = (theme: MicrositeTheme) => {
  return micrositeThemes[theme] || micrositeThemes.micita;
};

// Theme-specific CSS variables to be injected
export const getThemeCSSVariables = (theme: MicrositeTheme) => {
  const themes: Record<MicrositeTheme, Record<string, string>> = {
    micita: {
      '--theme-primary': '193 58 46', // Rojo Manta
      '--theme-secondary': '233 161 59', // Oro Inti
      '--theme-accent': '36 117 109', // Teal Andino
      '--theme-background': '250 247 242', // Crema suave
    },
    glassmorphism: {
      '--theme-primary': '79 70 229', // indigo-600
      '--theme-secondary': '147 51 234', // purple-600
      '--theme-accent': '14 165 233', // sky-500
      '--theme-background': '248 250 252', // slate-50
    },
    brutalist: {
      '--theme-primary': '239 68 68', // red-500
      '--theme-secondary': '253 224 71', // yellow-300
      '--theme-accent': '0 0 0', // black
      '--theme-background': '254 252 232', // yellow-50
    },
    'retro-futurism': {
      '--theme-primary': '34 211 238', // cyan-400
      '--theme-secondary': '236 72 153', // pink-500
      '--theme-accent': '6 182 212', // cyan-500
      '--theme-background': '11 15 25', // dark night
    },
    'bento-grid': {
      '--theme-primary': '234 88 12', // orange-600
      '--theme-secondary': '245 158 11', // amber-500
      '--theme-accent': '251 191 36', // yellow-400
      '--theme-background': '247 245 240', // warm stone
    }
  };

  return themes[theme] || themes.micita;
};