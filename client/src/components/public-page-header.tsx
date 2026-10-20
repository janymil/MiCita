import type { ReactNode } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { MicitaLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublicPageHeaderProps {
  /** Business the customer is coming from, shown as context in the bar. */
  businessName?: string | null;
  /** Optional business phone for a quick call shortcut. */
  phone?: string | null;
  /** Where to go when there is no in-app history and no `from` hint. */
  fallbackHref?: string;
  /** Label of the back action. */
  backLabel?: string;
  className?: string;
}

/**
 * Normalizes the `?from=<slug>` hint added by microsite links. Only slugs are
 * accepted so a crafted link cannot turn the back button into an open redirect.
 */
function readFromHint(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("from")?.trim() ?? "";
  if (!raw) return null;
  const slug = raw.replace(/^\/+/, "");
  return /^[a-z0-9-]+$/i.test(slug) ? slug : null;
}

/**
 * Shared top bar for every public (customer-facing) flow reached from a
 * microsite: queue, waitlist, promos, reviews, loyalty, packages, appointments.
 * Always renders a back button so the customer can return to the business page.
 */
export function PublicPageHeader({
  businessName,
  phone,
  fallbackHref = "/",
  backLabel = "Volver",
  className,
}: PublicPageHeaderProps) {
  const [, navigate] = useLocation();

  const goBack = () => {
    if (typeof window === "undefined") return;

    // Microsite links carry the business slug, so we can always return there
    // even when the page was opened from a QR / WhatsApp link in a new tab.
    const from = readFromHint();
    if (from) {
      navigate(`/${from}`);
      return;
    }

    // Opened from another page in this app (microsite, waitlist claim, etc.).
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate(fallbackHref);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2 px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="-ml-2 shrink-0 gap-1.5 rounded-full px-2.5 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Volver a la página anterior"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">{backLabel}</span>
        </Button>

        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-neutral-500">
          {businessName ?? ""}
        </span>

        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Llamar a ${businessName ?? "el negocio"}`}
          >
            <Phone className="h-4 w-4" />
          </a>
        ) : null}

        <MicitaLogo href="/" size="sm" className="shrink-0" />
      </div>
    </header>
  );
}

interface PublicPageShellProps extends Omit<PublicPageHeaderProps, "className"> {
  children: ReactNode;
  maxWidth?: string;
  /** Extra classes for the content column. */
  className?: string;
}

/**
 * Standard layout for public flow pages: header with back button + centered
 * content column. Keeps every microsite destination visually consistent.
 */
export function PublicPageShell({
  children,
  maxWidth = "max-w-lg",
  className,
  ...headerProps
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <PublicPageHeader {...headerProps} />
      <main className={cn("mx-auto w-full space-y-4 px-4 py-6 pb-10", maxWidth, className)}>
        {children}
      </main>
    </div>
  );
}
