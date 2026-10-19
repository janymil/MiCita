import { CalendarCheck } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface MicitaLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizes = {
  sm: { box: "w-7 h-7 rounded-lg", icon: "w-4 h-4", word: "text-lg" },
  md: { box: "w-9 h-9 rounded-xl", icon: "w-5 h-5", word: "text-2xl" },
  lg: { box: "w-12 h-12 rounded-2xl", icon: "w-7 h-7", word: "text-3xl" },
} as const;

/**
 * Logo oficial de MiCita — marca "Atardecer Andino".
 * Marca: cuadro con degradado Rojo Manta → Oro Inti e icono de calendario.
 * Tipografía: Fraunces (display) con "Cita" en degradado marca.
 */
export function MicitaLogo({ href = "/", size = "md", showTagline = false, className, onClick }: MicitaLogoProps) {
  const s = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2.5 group select-none", className)} onClick={onClick}>
      <span
        className={cn(
          "bg-brand-gradient flex items-center justify-center shadow-brand shrink-0",
          "transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105",
          s.box
        )}
      >
        <CalendarCheck className={cn("text-white", s.icon)} strokeWidth={2.5} />
      </span>
      <span className="leading-none">
        <span className={cn("font-display font-bold tracking-tight", "text-[hsl(var(--brand-tinta))]", s.word)}>
          Mi<span className="text-brand-gradient">Cita</span>
        </span>
        {showTagline && (
          <span className="block font-hand text-sm leading-tight text-[hsl(var(--brand-manta))]">
            tu cita, a un toque
          </span>
        )}
      </span>
    </span>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

/** Sol andino decorativo: arco punteado que remata titulares importantes. */
export function AndeanSun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 28" fill="none" className={cn("w-28", className)} aria-hidden="true">
      <path
        d="M6 26 C 26 6, 42 4, 60 12 C 76 19, 98 18, 114 8"
        stroke="hsl(var(--brand-gold))"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <circle cx="60" cy="11" r="4.5" fill="hsl(var(--brand-manta))" />
    </svg>
  );
}

/** Motivo chakana pequeño para separadores o detalles decorativos. */
export function ChakanaMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={cn("w-8 h-8", className)} aria-hidden="true">
      <path
        d="M36 4l8 8h-8v8h8v8h8v8h8l8 8-8 8v-8h-8v8h-8v8l-8 8-8-8h8v-8h-8v-8h-8v-8l-8-8 8-8v8h8v-8h8v-8h8z"
        fill="none"
        stroke="hsl(var(--brand-manta))"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
