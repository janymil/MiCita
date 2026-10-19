import BookingWidget from "@/components/booking-widget";
import PopularTimes from "@/components/popular-times";
import MicrositeThemeSelector from "@/components/microsite-theme-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MicrositeSkeletonLoader } from "@/components/ui/skeleton";
import { useMicrositeTheme } from "@/contexts/MicrositeThemeContext";
import { useToast } from "@/hooks/use-toast";
import { categories } from "@/lib/constants";
import { getThemeClasses, getThemeCSSVariables, micrositeThemes } from "@/lib/microsite-themes";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Facebook,
  GraduationCap,
  Heart,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Music2,
  Navigation,
  Palette,
  Phone,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

interface MicrositeBusiness {
  id: number;
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: unknown;
  [key: string]: unknown;
}

interface MicrositeService {
  id: number;
  name: string;
  description?: string | null;
  duration: number | null;
  price: string | null;
}

interface MicrositeGalleryItem {
  id: number;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
}

interface MicrositeReview {
  id: number;
  rating: number;
  comment?: string | null;
  clientName?: string | null;
  source?: string | null;
  ownerReply?: string | null;
  createdAt?: string | null;
}

interface MicrositeData {
  business: MicrositeBusiness;
  settings?: Record<string, any> | null;
  services: MicrositeService[];
  gallery: MicrositeGalleryItem[];
  reviews: MicrositeReview[];
  stats?: { rating: number; reviewCount: number; serviceCount: number };
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function normalizeHours(hours: unknown) {
  if (!hours) return [] as Array<{ day: string; label: string; text: string; open: boolean }>;
  const rows: Array<{ day: string; label: string; text: string; open: boolean }> = [];
  if (Array.isArray(hours)) {
    hours.forEach((h: string) => {
      const [d, ...rest] = h.split(":");
      const key = d.trim().toLowerCase();
      const range = rest.join(":").trim();
      const open = !!range && !/closed|cerrado/i.test(range);
      rows.push({ day: key, label: DAY_LABELS[key] || d.trim(), text: open ? range : "Cerrado", open });
    });
  } else if (typeof hours === "object") {
    Object.entries(hours as Record<string, any>).forEach(([key, s]) => {
      const k = key.toLowerCase();
      const open = s && !s.closed && s.open && s.close;
      rows.push({ day: k, label: DAY_LABELS[k] || key, text: open ? `${s.open} – ${s.close}` : "Cerrado", open: !!open });
    });
  }
  return rows.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

const todayKey = () =>
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];

const whatsappLink = (phone: string, businessName = "") => {
  const d = phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hola ${businessName ? businessName : ""}, vi tu micrositio y deseo consultar por una cita.`
  );
  return `https://wa.me/${d.length === 9 ? `51${d}` : d}?text=${text}`;
};

function StarRow({ rating, className = "w-4 h-4" }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200 dark:text-neutral-700 dark:fill-neutral-700"
          }`}
        />
      ))}
    </span>
  );
}

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useMicrositeTheme();
  const { toast } = useToast();

  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "gallery" | "about" | "reviews" | "contact">("services");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<MicrositeGalleryItem | null>(null);
  const [showAllHours, setShowAllHours] = useState(false);

  // Form states
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  // Declared here (before any early return) so the hook order never changes
  // between the loading / not-found / ready renders.
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const { data: micrositeData, isLoading, error } = useQuery<MicrositeData>({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: Boolean(slug),
  });

  const { data: popularTimesResponse } = useQuery<{
    cells: Array<{ day: number; hour: number; count: number; popularity: number }>;
  }>({
    queryKey: [`/api/micrositio/${slug}/popular-times`],
    enabled: Boolean(slug),
  });

  const { business, settings, services = [], gallery = [], reviews = [] } = micrositeData || {
    business: {} as MicrositeBusiness,
    services: [],
    gallery: [],
    reviews: [],
  };

  // ---- Microsite analytics (anonymous, cookie-less) -----------------------
  const trackEvent = (type: "view" | "whatsapp_click" | "book_click") => {
    if (!slug) return;
    try {
      let sessionId = sessionStorage.getItem("micita_session");
      if (!sessionId) {
        sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem("micita_session", sessionId);
      }
      void fetch(`/api/micrositio/${slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          type,
          referrer: document.referrer || null,
          path: window.location.pathname,
          sessionId,
        }),
      });
    } catch {
      // Analytics must never break the page.
    }
  };

  useEffect(() => {
    trackEvent("view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const onBookClick = () => trackEvent("book_click");
    window.addEventListener("micita:book-click", onBookClick);
    return () => window.removeEventListener("micita:book-click", onBookClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);


  const categoryInfo = useMemo(() => {
    return categories.find((c) => c.id === business?.category);
  }, [business?.category]);

  // Reactive theme configuration
  const themeConfig = useMemo(() => {
    return getThemeClasses(theme);
  }, [theme]);

  // Sync theme CSS variables dynamically
  useEffect(() => {
    const vars = getThemeCSSVariables(theme);
    const root = document.documentElement;
    Object.entries(vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
  }, [theme]);

  const avgRating = useMemo(() => {
    if (micrositeData?.stats?.rating) return micrositeData.stats.rating;
    return reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  }, [reviews, micrositeData?.stats?.rating]);

  const phone = settings?.publicPhone || business?.phone || null;
  const email = settings?.publicEmail || business?.email || null;
  const address = settings?.streetAddress || business?.address || null;
  const hoursRows = useMemo(() => {
    // Priority: structured business hours → microsite working hours → free-text per day.
    const direct = normalizeHours(business?.hours);
    if (direct.length > 0) return direct;

    const structured = settings?.workingHours as
      | Record<string, { enabled?: boolean; start?: string; end?: string }>
      | undefined;
    if (structured && Object.keys(structured).length > 0) {
      return DAY_ORDER.map((day) => {
        const value = structured[day];
        const open = Boolean(value && value.enabled !== false);
        return {
          day,
          label: DAY_LABELS[day],
          text: open ? `${value?.start ?? "09:00"} – ${value?.end ?? "17:00"}` : "Cerrado",
          open,
        };
      });
    }

    const perDay: Array<[string, string | undefined]> = [
      ["monday", settings?.mondayHours],
      ["tuesday", settings?.tuesdayHours],
      ["wednesday", settings?.wednesdayHours],
      ["thursday", settings?.thursdayHours],
      ["friday", settings?.fridayHours],
      ["saturday", settings?.saturdayHours],
      ["sunday", settings?.sundayHours],
    ];
    const filled = perDay
      .filter(([, value]) => Boolean(value && String(value).trim()))
      .map(([day, value]) => {
        const text = String(value).trim();
        const open = !/closed|cerrado/i.test(text);
        return { day, label: DAY_LABELS[day], text, open };
      });

    return filled
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
      .map((row) => ({ ...row, text: row.text }));
  }, [business?.hours, settings]);
  const canBook = !!settings?.enablePublicBooking && services.length > 0;
  const mapUrl = address ? `https://www.google.com/maps/search/${encodeURIComponent(address)}` : null;

  const todayRow = useMemo(() => hoursRows.find((r) => r.day === todayKey()), [hoursRows]);
  const isOpenNow = todayRow?.open ?? false;

  const popularTimesData = useMemo(() => {
    const cells = popularTimesResponse?.cells ?? [];
    return cells.reduce<Record<string, { hours: { hour: number; percentage: number }[] }>>((acc, cell) => {
      const key = String(cell.day);
      acc[key] = acc[key] ?? { hours: [] };
      acc[key].hours.push({ hour: cell.hour, percentage: cell.popularity });
      return acc;
    }, {});
  }, [popularTimesResponse]);
  const lowestPrice = useMemo(() => {
    const prices = services
      .map((s) => parseFloat(s.price || "0"))
      .filter((p) => !isNaN(p) && p > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, serviceSearch]);

  const socials = useMemo(() => {
    return [
      settings?.facebookUrl && { href: settings.facebookUrl, icon: Facebook, label: "Facebook" },
      settings?.instagramUrl && { href: settings.instagramUrl, icon: Instagram, label: "Instagram" },
      settings?.tiktokUrl && { href: settings.tiktokUrl, icon: Music2, label: "TikTok" },
      settings?.youtubeUrl && { href: settings.youtubeUrl, icon: Youtube, label: "YouTube" },
    ].filter(Boolean) as Array<{ href: string; icon: any; label: string }>;
  }, [settings]);

  if (isLoading) return <MicrositeSkeletonLoader />;

  if (error || !micrositeData || !business?.id) {
    if (slug && (slug.startsWith("dashboard") || ["login", "registro", "business", "buscar", "documentation"].includes(slug))) {
      return null;
    }
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Negocio no disponible
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
            El micrositio que buscas no existe o aún no está publicado en la red MiCita.
          </p>
          <Button onClick={() => (window.location.href = "/")} className="w-full brand-btn-primary border-0 rounded-2xl h-12 font-medium">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const submitReview = async () => {
    if (!business?.id) return;
    if (!reviewName.trim() || reviewComment.trim().length < 5) {
      toast({
        title: "Completa todos los campos",
        description: "Por favor escribe tu nombre y tu experiencia (mínimo 5 caracteres).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          clientName: reviewName.trim(),
          rating: reviewStars,
          comment: reviewComment.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: "No se pudo enviar la reseña",
          description: data?.message || "Inténtalo de nuevo en unos minutos.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "¡Gracias por tu reseña!",
        description: data?.message || "Será publicada después de la revisión del negocio.",
      });
      setReviewName("");
      setReviewComment("");
      setReviewStars(5);
    } catch {
      toast({
        title: "Error de conexión",
        description: "No pudimos enviar tu reseña. Revisa tu internet e inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const submitContact = async () => {
    if (!slug) return;
    if (!contactName.trim() || contactMessage.trim().length < 5) {
      toast({
        title: "Completa los campos obligatorios",
        description: "Escribe tu nombre y tu consulta.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingContact(true);
    try {
      const response = await fetch(`/api/micrositio/${slug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim() || undefined,
          message: contactMessage.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: "No se pudo enviar",
          description: data?.message || "Inténtalo de nuevo por favor.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "¡Mensaje enviado!",
        description: "El negocio recibió tu consulta y te contactará pronto.",
      });
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch {
      toast({
        title: "Error de conexión",
        description: "No pudimos enviar tu mensaje. Inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Dynamic available tabs
  const tabs = [
    { id: "services", label: "Servicios", count: services.length, icon: Sparkles },
    ...(settings?.enableGallery && gallery.length > 0
      ? [{ id: "gallery", label: "Galería", count: gallery.length, icon: Camera }]
      : []),
    ...(settings?.aboutUs || settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations
      ? [{ id: "about", label: "Sobre Nosotros", count: null, icon: GraduationCap }]
      : []),
    ...(settings?.enableReviews || reviews.length > 0
      ? [{ id: "reviews", label: "Opiniones", count: reviews.length, icon: Star }]
      : []),
    { id: "contact", label: "Ubicación y Contacto", count: null, icon: MapPin },
  ] as const;

  return (
    <div className={`min-h-screen ${themeConfig.background} ${themeConfig.text} transition-colors duration-300 font-sans`}>
      
      {/* ── TOP UTILITY NAVIGATION BAR (REACTS TO THEME) ── */}
      <header className={`sticky top-0 z-40 ${themeConfig.header} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform">
                <span className="w-2 h-2 rounded-full bg-white" />
              </span>
              <span className="font-display font-bold text-base tracking-tight">
                MiCita
              </span>
            </a>
            <span className="opacity-30">/</span>
            <span className="font-medium text-sm opacity-80 truncate max-w-[180px] sm:max-w-xs">
              {business.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Visual theme button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsThemeSelectorOpen(true)}
              className="text-xs h-9 px-3 rounded-full border-current/20 bg-white/50 dark:bg-black/30 backdrop-blur-md gap-1.5 shadow-sm hover:scale-105 transition-transform"
            >
              <Palette className="w-3.5 h-3.5 text-red-500" />
              <span className="font-medium">Tema:</span>
              <span className="font-bold capitalize opacity-90">{micrositeThemes[theme]?.name.split(' ')[0] || theme}</span>
            </Button>

            {phone && (
              <a href={whatsappLink(phone, business.name)} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("whatsapp_click")}>
                <Button
                  size="sm"
                  className="h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── CINEMATIC MODERN HERO ── */}
      <section className="relative bg-neutral-900 text-white overflow-hidden">
        {/* Cover background */}
        <div className="absolute inset-0 z-0">
          {settings?.coverImage ? (
            <img
              src={settings.coverImage}
              alt={business.name}
              className="w-full h-full object-cover opacity-50 scale-105 transform transition-transform duration-1000"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-neutral-950 via-neutral-900 to-red-950/60" />
          )}
          {/* Subtle multi-layer gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-transparent to-neutral-950/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 md:pt-16 md:pb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            
            {/* Identity & Badges */}
            <div className="flex items-start sm:items-center gap-5 sm:gap-6">
              {/* Profile Avatar */}
              <div className="relative shrink-0">
                {settings?.profileImage ? (
                  <img
                    src={settings.profileImage}
                    alt={business.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white/10 shadow-2xl backdrop-blur-md"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-display font-bold text-4xl shadow-2xl ring-4 ring-white/10">
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-neutral-900 flex items-center justify-center ${
                    isOpenNow ? "bg-emerald-500" : "bg-neutral-500"
                  }`}
                  title={isOpenNow ? "Abierto" : "Cerrado"}
                >
                  <span className={`w-2 h-2 rounded-full bg-white ${isOpenNow ? "animate-ping" : ""}`} />
                </div>
              </div>

              {/* Title & metadata */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {categoryInfo && (
                    <Badge className="bg-white/10 hover:bg-white/15 text-white/90 border-0 rounded-full px-3 py-0.5 text-xs font-medium backdrop-blur-md">
                      {categoryInfo.name}
                    </Badge>
                  )}
                  {avgRating > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 rounded-full px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{avgRating.toFixed(1)}</span>
                      <span className="text-amber-200/60 font-normal">({reviews.length})</span>
                    </div>
                  )}
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium backdrop-blur-md ${
                      isOpenNow
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? "bg-emerald-400" : "bg-neutral-400"}`} />
                    {isOpenNow ? "Abierto ahora" : "Cerrado"}
                  </div>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                  {business.name}
                </h1>

                {settings?.professionalTitle && (
                  <p className="text-white/70 text-sm sm:text-base mt-1 font-light max-w-xl">
                    {settings.professionalTitle}
                  </p>
                )}

                {address && (
                  <p className="flex items-center gap-1.5 text-white/60 text-xs sm:text-sm mt-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate max-w-md">{address}{settings?.district ? `, ${settings.district}` : ""}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Metrics & Call to Action */}
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              {phone && (
                <a href={`tel:${phone}`}>
                  <Button
                    variant="outline"
                    className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border-white/15 text-white text-xs font-medium backdrop-blur-md gap-2 shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar
                  </Button>
                </a>
              )}

              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border-white/15 text-white text-xs font-medium backdrop-blur-md gap-2 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Cómo llegar
                  </Button>
                </a>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER WITH DEDICATED SIDEBAR ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ══════════════════════════════════════════════════════════
              LEFT / MAIN AREA: MODERN TABBED NAVIGATION & VIEWS
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* Segmented Pill Tabs Navigation (Uses theme card/button) */}
            <div className={`${themeConfig.card} p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide`}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                      isActive
                        ? `${themeConfig.button} shadow-sm scale-[1.01]`
                        : "opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-black/5 dark:bg-white/10 opacity-80"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB VIEW 1: SERVICIOS */}
            {activeTab === "services" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Search & Filter bar for services */}
                <div className={`${themeConfig.card} p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Buscar un servicio o tratamiento…"
                      className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    {serviceSearch && (
                      <button
                        onClick={() => setServiceSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs opacity-60 font-medium px-2 text-right">
                    {filteredServices.length} disponible{filteredServices.length === 1 ? "" : "s"}
                  </div>
                </div>

                {/* Service Cards (Borderless, elevated, reacts to Theme) */}
                {filteredServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        className={`${themeConfig.card} p-6 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-200`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-display font-bold text-lg leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                              {service.name}
                            </h3>
                            {service.price && (
                              <div className="text-right shrink-0">
                                <span className="font-display font-extrabold text-xl">
                                  S/ {service.price}
                                </span>
                              </div>
                            )}
                          </div>

                          {service.description && (
                            <p className="text-sm opacity-70 leading-relaxed mb-4 line-clamp-3">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 mt-4">
                          {service.duration ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/5 opacity-80">
                              <Clock className="w-3.5 h-3.5 opacity-60" />
                              {service.duration} min
                            </span>
                          ) : (
                            <span />
                          )}

                          {canBook && (
                            <div className="scale-90 origin-right">
                              <BookingWidget
                                services={services}
                                businessId={business.id}
                                workingHours={settings?.workingHours}
                                blockedDates={settings?.blockedDates}
                                blockedHours={settings?.blockedHours}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${themeConfig.card} p-12 text-center`}>
                    <p className="opacity-50 text-sm">No se encontraron servicios con "{serviceSearch}".</p>
                    <Button
                      variant="ghost"
                      onClick={() => setServiceSearch("")}
                      className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400"
                    >
                      Ver todos los servicios
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 2: GALERÍA */}
            {activeTab === "gallery" && settings?.enableGallery && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className={`${themeConfig.card} p-6`}>
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-bold">
                      Galería de Trabajos y Espacio
                    </h2>
                    <p className="text-sm opacity-60 mt-1">
                      Conoce las instalaciones y los resultados reales de {business.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {gallery.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedPhoto(item)}
                        className={`group relative overflow-hidden rounded-2xl cursor-pointer bg-black/5 dark:bg-white/5 ${
                          index === 0 ? "sm:col-span-2 sm:row-span-2 aspect-video sm:aspect-square" : "aspect-square"
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title || `Foto de ${business.name}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                          <p className="text-sm font-semibold truncate">{item.title || "Ver detalle"}</p>
                          {item.description && <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{item.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 3: SOBRE NOSOTROS */}
            {activeTab === "about" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className={`${themeConfig.card} p-8 space-y-8`}>
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-4">
                      Nuestra Historia y Filosofía
                    </h2>
                    {settings?.aboutUs ? (
                      <div
                        className="opacity-80 leading-relaxed space-y-4 text-base"
                        dangerouslySetInnerHTML={{ __html: settings.aboutUs.replace(/\n/g, "<br>") }}
                      />
                    ) : (
                      <p className="opacity-80 leading-relaxed text-base">
                        {settings?.publicDescription || business.description || "Comprometidos con brindarte la mejor atención y los mejores resultados."}
                      </p>
                    )}
                  </div>

                  {/* Highlights / Badges */}
                  {(settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-black/[0.06] dark:border-white/[0.06]">
                      {settings?.professionalTitle && (
                        <div className="bg-black/5 dark:bg-white/5 p-5 rounded-2xl">
                          <GraduationCap className="w-5 h-5 text-red-500 mb-2" />
                          <p className="text-xs font-semibold opacity-50 uppercase tracking-wider">Título Profesional</p>
                          <p className="font-bold text-sm mt-1">{settings.professionalTitle}</p>
                        </div>
                      )}
                      {settings?.yearsOfExperience && (
                        <div className="bg-black/5 dark:bg-white/5 p-5 rounded-2xl">
                          <ShieldCheck className="w-5 h-5 text-amber-500 mb-2" />
                          <p className="text-xs font-semibold opacity-50 uppercase tracking-wider">Trayectoria</p>
                          <p className="font-bold text-sm mt-1">{settings.yearsOfExperience} años de experiencia</p>
                        </div>
                      )}
                      {settings?.specializations && (
                        <div className="bg-black/5 dark:bg-white/5 p-5 rounded-2xl">
                          <Sparkles className="w-5 h-5 text-emerald-500 mb-2" />
                          <p className="text-xs font-semibold opacity-50 uppercase tracking-wider">Especialidad</p>
                          <p className="font-bold text-sm mt-1">{settings.specializations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB VIEW 4: RESEÑAS */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Rating Overview Card */}
                <div className={`${themeConfig.card} p-8 flex flex-col sm:flex-row items-center gap-8 justify-between`}>
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-black font-display tracking-tight">
                      {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                    </div>
                    <div>
                      <StarRow rating={avgRating} className="w-5 h-5" />
                      <p className="text-sm opacity-60 mt-1">
                        Basado en {reviews.length} opiniones de clientes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-medium border-current/20">
                      100% verificadas
                    </Badge>
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className={`${themeConfig.card} p-6 space-y-3 relative`}>
                        <Quote className="w-8 h-8 opacity-10 absolute top-4 right-4" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center font-bold text-sm">
                            {(rev.clientName || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{rev.clientName || "Cliente"}</p>
                            <StarRow rating={rev.rating} className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-sm opacity-75 leading-relaxed pt-1">
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${themeConfig.card} p-8 text-center`}>
                    <p className="opacity-50 text-sm">Aún no hay reseñas registradas para este negocio.</p>
                  </div>
                )}

                {/* Form to leave a review */}
                {settings?.enableReviews && (
                  <div className={`${themeConfig.card} p-8 space-y-5`}>
                    <div>
                      <h3 className="font-display font-bold text-xl">
                        Comparte tu Experiencia
                      </h3>
                      <p className="text-xs opacity-60 mt-0.5">
                        Tu opinión ayuda a otros usuarios a conocer la calidad de este negocio.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-semibold opacity-70 mb-1.5 block">Calificación</Label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setReviewStars(s)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-7 h-7 ${
                                  s <= reviewStars
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-neutral-200 text-neutral-300 dark:fill-neutral-800 dark:text-neutral-700"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rev-name" className="text-xs font-semibold opacity-70 mb-1.5 block">
                            Tu nombre
                          </Label>
                          <Input
                            id="rev-name"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                            placeholder="Ej. Roberto Díaz"
                            className="h-11 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-red-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="rev-comment" className="text-xs font-semibold opacity-70 mb-1.5 block">
                          Comentario
                        </Label>
                        <Textarea
                          id="rev-comment"
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Cuéntanos qué tal fue el servicio y la atención…"
                          className="rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-red-500/20"
                        />
                      </div>

                      <Button
                        onClick={submitReview}
                        disabled={isSubmittingReview}
                        className={`${themeConfig.button} h-11 px-6 font-semibold text-sm shadow-sm`}
                      >
                        {isSubmittingReview ? "Enviando…" : "Publicar reseña"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB VIEW 5: UBICACIÓN Y CONTACTO */}
            {activeTab === "contact" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className={`${themeConfig.card} p-8 space-y-6`}>
                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      Ubicación y Canales Directos
                    </h2>
                    <p className="text-sm opacity-60 mt-1">
                      Encuentra cómo llegar o envíanos un mensaje directo.
                    </p>
                  </div>

                  {address && (
                    <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold opacity-40 uppercase tracking-wider">Dirección</p>
                        <p className="font-semibold text-base mt-0.5">{address}</p>
                        {settings?.district && <p className="text-xs opacity-60">{settings.district}, {settings.region || "Perú"}</p>}
                      </div>
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="rounded-xl text-xs font-semibold h-10 px-4 gap-1.5 border-current/20">
                            Abrir en Google Maps
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Contact Form */}
                  {settings?.enableContactForm && (
                    <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4">
                      <h3 className="font-display font-bold text-lg">
                        Envía un Mensaje
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold opacity-70 mb-1.5 block">Tu nombre</Label>
                          <Input
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Nombre completo"
                            className="h-11 rounded-xl bg-black/5 dark:bg-white/5 border-0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold opacity-70 mb-1.5 block">Correo electrónico</Label>
                          <Input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="h-11 rounded-xl bg-black/5 dark:bg-white/5 border-0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold opacity-70 mb-1.5 block">Mensaje o consulta</Label>
                        <Textarea
                          rows={4}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Escribe aquí tu consulta o requerimiento especial…"
                          className="rounded-xl bg-black/5 dark:bg-white/5 border-0"
                        />
                      </div>
                      <Button
                        onClick={submitContact}
                        disabled={isSubmittingContact}
                        className={`${themeConfig.button} h-11 px-6 font-semibold text-sm shadow-sm gap-2`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSubmittingContact ? "Enviando…" : "Enviar mensaje"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT AREA: PERSISTENT MODERN SIDEBAR (STICKY ON DESKTOP)
             ══════════════════════════════════════════════════════════ */}
          <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 space-y-5">
            
            {/* Primary Action Booking Card (Uses themeConfig.card) */}
            <div className={`${themeConfig.card} p-6 space-y-6`}>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-50">
                    Reserva tu cita
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isOpenNow
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-black/5 dark:bg-white/10 opacity-70"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                    {isOpenNow ? "Atendiendo hoy" : "Cerrado"}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-bold">
                  Agenda en línea
                </h3>

                {lowestPrice && (
                  <p className="text-xs opacity-60 mt-1">
                    Servicios disponibles desde <span className="font-bold opacity-100">S/ {lowestPrice.toFixed(2)}</span>
                  </p>
                )}
              </div>

              {/* Guarantees */}
              <div className="space-y-2.5 py-1">
                <div className="flex items-center gap-2.5 text-xs opacity-80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Confirmación inmediata por WhatsApp y correo</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs opacity-80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Sin costo por reservar en línea</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs opacity-80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Elige el horario que mejor te convenga</span>
                </div>
              </div>

              {/* The Core Booking Widget trigger */}
              {canBook ? (
                <div className="pt-2">
                  <BookingWidget
                    services={services}
                    businessId={business.id}
                    workingHours={settings?.workingHours}
                    blockedDates={settings?.blockedDates}
                    blockedHours={settings?.blockedHours}
                  />
                </div>
              ) : (
                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl text-center">
                  <p className="text-xs opacity-60">
                    Las reservas automáticas están en mantenimiento. Contáctanos por WhatsApp.
                  </p>
                </div>
              )}

              {/* Quick Contact Buttons Row */}
              <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-2 gap-2">
                {phone && (
                  <a
                href={whatsappLink(phone, business.name)}
                onClick={() => trackEvent("whatsapp_click")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    WhatsApp
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar
                  </a>
                )}
              </div>
            </div>

            {/* Hours Card */}
            {hoursRows.length > 0 && (
              <div className={`${themeConfig.card} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-50" />
                    <h4 className="font-display font-bold text-sm">
                      Horarios de Atención
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowAllHours(!showAllHours)}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5"
                  >
                    {showAllHours ? "Ocultar" : "Ver todos"}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllHours ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Today's schedule banner */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs">
                  <span className="font-bold">
                    Hoy ({todayRow?.label || "Hoy"})
                  </span>
                  <span className={todayRow?.open ? "font-bold text-emerald-600 dark:text-emerald-400" : "opacity-50"}>
                    {todayRow?.text || "Cerrado"}
                  </span>
                </div>

                {/* All days dropdown */}
                {showAllHours && (
                  <div className="space-y-1.5 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] animate-in fade-in-50 duration-200">
                    {hoursRows.map((r) => {
                      const isToday = r.day === todayKey();
                      return (
                        <div
                          key={r.day}
                          className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg ${
                            isToday ? "bg-red-500/10 font-semibold text-red-600 dark:text-red-400" : "opacity-60"
                          }`}
                        >
                          <span>{r.label}</span>
                          <span className={r.open ? "opacity-90 font-medium" : "opacity-40"}>
                            {r.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Demand heatmap: helps a visitor pick a quieter time */}
            {popularTimesData && Object.keys(popularTimesData).length > 0 && (
              <div className={`${themeConfig.card} p-6 space-y-3`}>
                <PopularTimes data={popularTimesData} />
              </div>
            )}

            {/* Location & Mini Map snippet */}
            {address && (
              <div className={`${themeConfig.card} p-6 space-y-3`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h4 className="font-display font-bold text-sm">
                    ¿Dónde estamos?
                  </h4>
                </div>

                <p className="text-xs opacity-70 leading-relaxed">
                  {address}{settings?.district ? `, ${settings.district}` : ""}
                </p>

                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline pt-1"
                  >
                    Ver ruta en Google Maps
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Social links */}
            {socials.length > 0 && (
              <div className={`${themeConfig.card} p-6`}>
                <p className="text-xs font-bold opacity-50 uppercase tracking-wider mb-3">
                  Redes Oficiales
                </p>
                <div className="flex items-center gap-2">
                  {socials.map((s) => {
                    const SIcon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s.label}
                        className="w-10 h-10 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center opacity-70 hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm"
                      >
                        <SIcon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

          </aside>

        </div>
      </div>

      {/* ── PHOTO LIGHTBOX MODAL ── */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-50 duration-200"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title || ""}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            {selectedPhoto.title && (
              <div className="mt-4 text-center text-white">
                <p className="font-semibold text-base">{selectedPhoto.title}</p>
                {selectedPhoto.description && (
                  <p className="text-xs text-white/70 mt-1">{selectedPhoto.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MOBILE STICKY FLOATING BOTTOM BAR ── */}
      {canBook && (
        <div className={`lg:hidden fixed bottom-0 inset-x-0 z-30 ${themeConfig.header} p-4 shadow-2xl flex items-center justify-between gap-4 border-t border-current/10`}>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-50 block">
              {business.name}
            </span>
            <span className="text-sm font-bold">
              {lowestPrice ? `Desde S/ ${lowestPrice.toFixed(2)}` : "Reserva tu cita"}
            </span>
          </div>

          <div className="shrink-0">
            <BookingWidget
              services={services}
              businessId={business.id}
              workingHours={settings?.workingHours}
              blockedDates={settings?.blockedDates}
              blockedHours={settings?.blockedHours}
            />
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-current/10 bg-black/5 dark:bg-white/5 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
              {business.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-display font-bold text-sm">{business.name}</p>
              <p className="text-xs opacity-50">© 2026 Todos los derechos reservados.</p>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            <span>Micrositio potenciado por</span>
            <span className="font-display font-bold">MiCita</span>
          </a>
        </div>
      </footer>

      {/* Theme Selector Modal */}
      <MicrositeThemeSelector isOpen={isThemeSelectorOpen} onClose={() => setIsThemeSelectorOpen(false)} />
    </div>
  );
}
