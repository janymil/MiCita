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
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  Facebook,
  GraduationCap,
  Heart,
  Instagram,
  ListOrdered,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Music2,
  Navigation,
  Palette,
  Phone,
  Quote,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  ThumbsUp,
  Ticket,
  Users,
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
  desk?: {
    queueEnabled: boolean;
    promosEnabled: boolean;
    showQueueOnMicrosite: boolean;
    showPromosOnMicrosite: boolean;
    waitlistEnabled?: boolean;
    showWaitlistOnMicrosite?: boolean;
    loyaltyEnabled?: boolean;
    showLoyaltyOnMicrosite?: boolean;
    loyaltyStampsRequired?: number;
    loyaltyReward?: string;
    packagesEnabled?: boolean;
    showPackagesOnMicrosite?: boolean;
  } | null;
  stats?: { rating: number; reviewCount: number; serviceCount: number };
}

interface MicrositeQueueSnapshot {
  queue: {
    enabled: boolean;
    isOpen: boolean;
    isFull: boolean;
    closedReason: string | null;
    waitingCount: number;
    estimatedWaitMinutes: number;
    seated: { serviceName: string | null; remainingMinutes: number } | null;
  };
}

interface MicrositePromo {
  code: string;
  title: string;
  price: string;
  originalPrice: string | null;
  serviceName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  claimed: number;
  remaining: number;
  state: string;
  publicUrl: string;
}

interface MicrositePromosResponse {
  promosEnabled: boolean;
  promos: MicrositePromo[];
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
  const [activeTab, setActiveTab] = useState<"all" | "services" | "gallery" | "social" | "about" | "reviews" | "contact">("all");
  const [activeSocialFilter, setActiveSocialFilter] = useState<"all" | "instagram" | "tiktok" | "facebook">("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<MicrositeGalleryItem | null>(null);
  const [showAllHours, setShowAllHours] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Live "Saca tu turno" + promo cards for the public page. The owner controls
  // visibility in Configuración → Operación; data refreshes independently of
  // the 30s microsite cache.
  const desk = micrositeData?.desk;
  const liveBusinessId = micrositeData?.business?.id;

  const { data: liveQueue } = useQuery<MicrositeQueueSnapshot>({
    queryKey: [`/api/public/queue/${liveBusinessId}`],
    enabled: Boolean(liveBusinessId && desk?.queueEnabled && desk?.showQueueOnMicrosite),
    refetchInterval: 30_000,
  });

  const { data: livePromos } = useQuery<MicrositePromosResponse>({
    queryKey: [`/api/public/promos/by-business/${liveBusinessId}`],
    enabled: Boolean(liveBusinessId && desk?.showPromosOnMicrosite),
    refetchInterval: 60_000,
  });

  const { data: livePackages } = useQuery<{
    enabled: boolean;
    packages: Array<{
      id: number;
      name: string;
      description: string | null;
      uses: number;
      price: string;
      validityDays: number;
      serviceName: string;
      publicUrl: string;
    }>;
  }>({
    queryKey: [`/api/public/packages/by-business/${liveBusinessId}`],
    enabled: Boolean(liveBusinessId && desk?.showPackagesOnMicrosite),
    refetchInterval: 60_000,
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

  // Social Feed Showcase data (configured in Constructor de Micrositio -> Redes Sociales)
  const rawSocialFeed = settings?.deskSettings?.socialFeed;
  const socialFeedEnabled = rawSocialFeed?.enabled !== false;
  const allowedSocialPlatforms: Array<"instagram" | "tiktok" | "facebook"> = Array.isArray(rawSocialFeed?.platforms)
    ? rawSocialFeed.platforms
    : ["instagram", "tiktok", "facebook"];
  const customSocialPosts: Array<{
    id: string;
    platform: "instagram" | "tiktok" | "facebook";
    url: string;
    caption?: string;
    thumbnailUrl?: string;
  }> = Array.isArray(rawSocialFeed?.posts) ? rawSocialFeed.posts : [];

  const activeSocialChannels = [
    allowedSocialPlatforms.includes("instagram") && settings?.instagramUrl
      ? { id: "instagram" as const, label: "Instagram", url: settings.instagramUrl, icon: Instagram, gradient: "from-pink-500 via-red-500 to-amber-500" }
      : null,
    allowedSocialPlatforms.includes("tiktok") && settings?.tiktokUrl
      ? { id: "tiktok" as const, label: "TikTok", url: settings.tiktokUrl, icon: Music2, gradient: "from-neutral-900 via-neutral-800 to-cyan-500" }
      : null,
    allowedSocialPlatforms.includes("facebook") && settings?.facebookUrl
      ? { id: "facebook" as const, label: "Facebook", url: settings.facebookUrl, icon: Facebook, gradient: "from-blue-600 to-indigo-600" }
      : null,
  ].filter(Boolean) as Array<{
    id: "instagram" | "tiktok" | "facebook";
    label: string;
    url: string;
    icon: any;
    gradient: string;
  }>;

  const hasSocialFeedShowcase = socialFeedEnabled && (activeSocialChannels.length > 0 || customSocialPosts.length > 0);

  // Dynamic available views/tabs
  const tabs = [
    { id: "all", label: "Todo", count: null, icon: Compass },
    { id: "services", label: "Servicios", count: services.length, icon: Sparkles },
    ...(settings?.enableGallery && gallery.length > 0
      ? [{ id: "gallery", label: "Galería", count: gallery.length, icon: Camera }]
      : []),
    ...(settings?.aboutUs || settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations
      ? [{ id: "about", label: "Historia", count: null, icon: GraduationCap }]
      : []),
    ...(settings?.enableReviews || reviews.length > 0
      ? [{ id: "reviews", label: "Opiniones", count: reviews.length, icon: Star }]
      : []),
    { id: "contact", label: "Ubicación", count: null, icon: MapPin },
    ...(hasSocialFeedShowcase
      ? [{ id: "social", label: "En Redes", count: customSocialPosts.length || activeSocialChannels.length, icon: Instagram }]
      : []),
  ] as const;

  const showQueueOnMicrosite = Boolean(desk?.showQueueOnMicrosite && desk?.queueEnabled);
  const queueState = liveQueue?.queue;
  const showPromosOnMicrosite = Boolean(
    desk?.showPromosOnMicrosite && (livePromos?.promosEnabled ?? desk?.promosEnabled),
  );
  const micrositePromos = showPromosOnMicrosite ? livePromos?.promos ?? [] : [];
  const showWaitlistOnMicrosite = Boolean(
    desk?.showWaitlistOnMicrosite && desk?.waitlistEnabled,
  );
  const showLoyaltyOnMicrosite = Boolean(
    desk?.showLoyaltyOnMicrosite && desk?.loyaltyEnabled,
  );
  const micrositePackages = livePackages?.enabled ? livePackages.packages : [];
  const showPackagesOnMicrosite = Boolean(
    desk?.showPackagesOnMicrosite && micrositePackages.length > 0,
  );
  const hasDeskSection =
    showQueueOnMicrosite ||
    micrositePromos.length > 0 ||
    showWaitlistOnMicrosite ||
    showLoyaltyOnMicrosite ||
    showPackagesOnMicrosite;

  // Public flows show a "Volver" button; carrying the microsite slug lets it
  // return here even when the customer opened the link in a new tab (QR, ads).
  const withFrom = (href: string) => {
    if (!slug) return href;
    const hashIndex = href.indexOf("#");
    const base = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}from=${encodeURIComponent(slug)}${hash}`;
  };

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
              <span className="font-medium hidden sm:inline">Tema:</span>
              <span className="font-bold capitalize opacity-90">{micrositeThemes[theme]?.name.split(' ')[0] || theme}</span>
            </Button>

            {/* Share profile button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                  toast({
                    title: "Enlace copiado",
                    description: "El link del micrositio se copió a tu portapapeles.",
                  });
                }
              }}
              className="text-xs h-9 px-3 rounded-full border-current/20 bg-white/50 dark:bg-black/30 backdrop-blur-md gap-1.5 shadow-sm hover:scale-105 transition-transform"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 opacity-70" />}
              <span className="hidden sm:inline">{copiedLink ? "Copiado" : "Compartir"}</span>
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

      {/* ── 2027 AMBIENT EDITORIAL HERO ── */}
      <section className="relative overflow-hidden">
        {/* Cover Hero Canvas */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="relative rounded-[2.5rem] overflow-hidden min-h-[300px] sm:min-h-[360px] md:min-h-[420px] flex flex-col justify-end p-6 sm:p-10 md:p-12 shadow-2xl border border-black/5 dark:border-white/10">
            {/* Visual Background / Cover */}
            <div className="absolute inset-0 z-0">
              {settings?.coverImage ? (
                <img
                  src={settings.coverImage}
                  alt={business.name}
                  className="w-full h-full object-cover scale-105 transform hover:scale-100 transition-transform duration-1000 ease-out"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-amber-700/80 via-red-700/70 to-rose-900" />
              )}
              {/* Refined gradient overlay for crystal clear contrast & soft ambient light */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
            </div>

            {/* Hero Main Content */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
              
              {/* Business Identity */}
              <div className="flex items-start sm:items-center gap-5 sm:gap-6">
                {/* Profile Avatar with clean frosted ring */}
                <div className="relative shrink-0">
                  {settings?.profileImage ? (
                    <img
                      src={settings.profileImage}
                      alt={business.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl object-cover ring-4 ring-white/80 shadow-2xl backdrop-blur-md"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-display font-bold text-3xl sm:text-4xl shadow-2xl ring-4 ring-white/80">
                      {business.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
                      isOpenNow ? "bg-emerald-500" : "bg-neutral-500"
                    }`}
                    title={isOpenNow ? "Abierto" : "Cerrado"}
                  >
                    <span className={`w-2 h-2 rounded-full bg-white ${isOpenNow ? "animate-ping" : ""}`} />
                  </div>
                </div>

                {/* Typography & Pills */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {categoryInfo && (
                      <span className="bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-0.5 text-xs font-semibold backdrop-blur-md transition-colors">
                        {categoryInfo.name}
                      </span>
                    )}
                    {avgRating > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-400/25 text-amber-200 rounded-full px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>{avgRating.toFixed(1)}</span>
                        <span className="text-white/60 font-normal">({reviews.length})</span>
                      </div>
                    )}
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold backdrop-blur-md ${
                        isOpenNow
                          ? "bg-emerald-500/30 text-emerald-200"
                          : "bg-black/40 text-neutral-300"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? "bg-emerald-400" : "bg-neutral-400"}`} />
                      {isOpenNow ? "Abierto ahora" : "Cerrado"}
                    </div>
                  </div>

                  <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                    {business.name}
                  </h1>

                  {settings?.professionalTitle && (
                    <p className="text-white/80 text-xs sm:text-sm md:text-base font-medium max-w-xl">
                      {settings.professionalTitle}
                    </p>
                  )}

                  {address && (
                    <p className="flex items-center gap-1.5 text-white/70 text-xs sm:text-sm">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate max-w-md">{address}{settings?.district ? `, ${settings.district}` : ""}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Floating on Glass */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 md:justify-end">
                {showQueueOnMicrosite && (
                  <a href={withFrom(`/q/${business.id}`)}>
                    <Button className="h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold gap-2 shadow-xl shadow-red-600/30">
                      <ListOrdered className="w-3.5 h-3.5" />
                      Saca tu turno
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone}`}>
                    <Button
                      variant="outline"
                      className="h-11 px-5 rounded-2xl bg-white/15 hover:bg-white/25 border-white/20 text-white text-xs font-semibold backdrop-blur-md gap-2 shadow-sm"
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
                      className="h-11 px-5 rounded-2xl bg-white/15 hover:bg-white/25 border-white/20 text-white text-xs font-semibold backdrop-blur-md gap-2 shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Cómo llegar
                    </Button>
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE QUEUE + PROMOS (public, owner-controlled) ── */}
      {hasDeskSection && (
        <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 -mt-6 md:-mt-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {showQueueOnMicrosite && (
              <div className={`${themeConfig.card} p-5 flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
                      Fila en vivo
                    </p>
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-red-500" />
                      Saca tu turno
                    </h3>
                  </div>
                  <span
                    className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                      queueState?.isOpen
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-black/5 dark:bg-white/10 opacity-70"
                    }`}
                  >
                    {queueState?.isOpen ? "Abierta" : "Cerrada"}
                  </span>
                </div>

                {queueState ? (
                  <>
                    <p className="text-sm opacity-70">
                      {queueState.isOpen
                        ? `${queueState.waitingCount} en cola · espera ~${queueState.estimatedWaitMinutes} min`
                        : queueState.closedReason ?? "La cola está cerrada ahora."}
                    </p>
                    {queueState.seated && (
                      <p className="text-xs opacity-60">
                        Ahora en la silla: {queueState.seated.serviceName ?? "servicio"} · quedan ~
                        {queueState.seated.remainingMinutes} min
                      </p>
                    )}
                    <a href={withFrom(`/q/${business.id}`)} className="mt-auto">
                      <Button
                        className={`w-full h-11 rounded-2xl text-xs font-semibold ${themeConfig.button}`}
                      >
                        {queueState.isOpen ? "Pedir mi turno" : "Ver estado de la cola"}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </a>
                  </>
                ) : (
                  <p className="text-sm opacity-60">Cargando la fila…</p>
                )}
              </div>
            )}

            {micrositePromos.length > 0 && (
              <div className={`${showQueueOnMicrosite ? "lg:col-span-2" : "lg:col-span-3"} space-y-3`}>
                <div className="flex items-end justify-between gap-2 px-1">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
                      Precios especiales
                    </p>
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-red-500" />
                      Promos de horas muertas
                    </h3>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {micrositePromos.slice(0, 4).map((promo) => {
                    const [, month, day] = promo.date.split("-");
                    return (
                      <a
                        key={promo.code}
                        href={withFrom(promo.publicUrl)}
                        className={`${themeConfig.card} p-4 block group hover:-translate-y-0.5 transition-transform`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{promo.title}</p>
                            {promo.serviceName && (
                              <p className="text-xs opacity-60 truncate">{promo.serviceName}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display font-extrabold text-lg text-emerald-600">
                              S/ {Number(promo.price).toFixed(2)}
                            </p>
                            {promo.originalPrice && (
                              <p className="text-[11px] opacity-50 line-through">
                                S/ {Number(promo.originalPrice).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {day}/{month}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {promo.startTime}–{promo.endTime}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {promo.remaining > 0 ? `${promo.remaining} cupos` : "Completo"}
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                          {promo.remaining > 0 ? "Reservar cupo" : "Ver promo"}
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </p>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {showWaitlistOnMicrosite && (
            <div
              className={`${themeConfig.card} mt-4 p-4 flex flex-wrap items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
                    ¿No hay cupo?
                  </p>
                  <h3 className="font-display text-base font-bold">Lista de espera</h3>
                </div>
              </div>
              <a href={withFrom(`/lista/${business.id}`)}>
                <Button className={`h-10 rounded-2xl text-xs font-semibold ${themeConfig.button}`}>
                  Avísame si se libera
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </a>
            </div>
          )}

          {showLoyaltyOnMicrosite && (
            <div
              className={`${themeConfig.card} mt-4 p-4 flex flex-wrap items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
                    Cliente frecuente
                  </p>
                  <h3 className="font-display text-base font-bold">
                    {desk?.loyaltyStampsRequired ?? 5} sellos = {desk?.loyaltyReward ?? "un premio"}
                  </h3>
                </div>
              </div>
              <a href={withFrom(`/tarjeta/${business.id}`)}>
                <Button className={`h-10 rounded-2xl text-xs font-semibold ${themeConfig.button}`}>
                  Ver mi tarjeta
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </a>
            </div>
          )}

          {showPackagesOnMicrosite && (
            <div className="mt-4 space-y-2">
              <div className="flex items-end justify-between gap-2 px-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">
                    Ahorra y vuelve
                  </p>
                  <h3 className="font-display text-base font-bold flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-red-500" />
                    Bonos prepagados
                  </h3>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {micrositePackages.slice(0, 3).map((pkg) => (
                  <a key={pkg.id} href={withFrom(pkg.publicUrl)} className={`${themeConfig.card} block p-4`}>
                    <p className="font-bold">{pkg.name}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {pkg.uses} usos de {pkg.serviceName} · {pkg.validityDays} días
                    </p>
                    <p className="mt-3 text-lg font-bold text-red-600 dark:text-red-400">
                      S/ {Number(pkg.price).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs font-semibold inline-flex items-center gap-1">
                      Comprar bono <ArrowRight className="w-3 h-3" />
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── MAIN CONTENT CONTAINER: 2027 EDITORIAL CANVAS ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

          {/* ══════════════════════════════════════════════════════════
              LEFT / MAIN AREA: OPEN EDITORIAL CANVAS (NO BOXY CARD WALLS)
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-16">

            {/* ── FLOATING EDITORIAL STATS & NAVIGATION RIBBON ── */}
            <div className="space-y-6">
              {/* Open Typographic Stats Strip (No white boxes, pure editorial rhythm) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-4 border-y border-current/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1">
                    Calificación
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl sm:text-4xl font-black tracking-tight">
                      {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
                    </span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                  </div>
                  <span className="text-xs opacity-50 mt-0.5">
                    {reviews.length > 0 ? `${reviews.length} reseñas verificadas` : "Calidad verificada"}
                  </span>
                </div>

                <div className="flex flex-col border-l border-current/10 pl-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1">
                    Experiencias
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-black tracking-tight">
                    {services.length}
                  </div>
                  <span className="text-xs opacity-50 mt-0.5">
                    {lowestPrice ? `Desde S/ ${lowestPrice.toFixed(0)}` : "Servicios activos"}
                  </span>
                </div>

                <div className="flex flex-col sm:border-l border-current/10 sm:pl-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1">
                    Respaldo
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-black tracking-tight">
                    {settings?.yearsOfExperience ? `${settings.yearsOfExperience}+` : "100%"}
                  </div>
                  <span className="text-xs opacity-50 mt-0.5">
                    {settings?.yearsOfExperience ? "Años de trayectoria" : "Garantía profesional"}
                  </span>
                </div>

                <div className="flex flex-col border-l border-current/10 pl-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1">
                    Disponibilidad
                  </span>
                  <div className={`font-display text-xl sm:text-2xl font-bold flex items-center gap-2 mt-1 ${isOpenNow ? "text-emerald-600 dark:text-emerald-400" : "opacity-60"}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isOpenNow ? "bg-emerald-500 animate-ping" : "bg-neutral-400"}`} />
                    <span>{isOpenNow ? "Abierto" : "Cerrado"}</span>
                  </div>
                  <span className="text-xs opacity-50 mt-1 truncate">
                    {todayRow?.text || "Consulta horarios"}
                  </span>
                </div>
              </div>

              {/* Minimalist Floating Section Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        if (tab.id !== "all") {
                          const el = document.getElementById(`section-${tab.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 shrink-0 ${
                        isActive
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md"
                          : "bg-black/[0.04] dark:bg-white/[0.06] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                      {tab.count !== null && (
                        <span className="opacity-60 text-[10px]">({tab.count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ 01. INTERACTIVE EDITORIAL SERVICE MENU (No boxy white windows!) ═══ */}
            {(activeTab === "all" || activeTab === "services") && (
              <section id="section-services" className="space-y-6 scroll-mt-24">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400 mb-1.5">
                      <span>01</span>
                      <span className="w-6 h-px bg-current opacity-40" />
                      <span>Menú de Servicios</span>
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                      Experiencias & Tarifas
                    </h2>
                  </div>

                  {/* Minimalist Pill Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Filtrar servicio…"
                      className="w-full pl-9 pr-8 py-2 bg-transparent border-b border-current/20 focus:border-red-500 text-xs sm:text-sm placeholder:opacity-40 focus:outline-none transition-colors"
                    />
                    {serviceSearch && (
                      <button
                        onClick={() => setServiceSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sleek Editorial Menu List */}
                {filteredServices.length > 0 ? (
                  <div className="divide-y divide-current/10 border-t border-b border-current/10">
                    {filteredServices.map((service, idx) => {
                      const isPopular = idx === 0;
                      return (
                        <div
                          key={service.id}
                          className="group py-5 sm:py-6 px-2 sm:px-4 -mx-2 sm:-mx-4 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          {/* Service Index + Info */}
                          <div className="flex items-start gap-4 min-w-0">
                            <span className="font-mono text-xs opacity-30 font-semibold pt-1.5 hidden sm:inline-block w-6 shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display font-bold text-lg sm:text-xl tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                  {service.name}
                                </h3>
                                {isPopular && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Destacado
                                  </span>
                                )}
                                {service.duration && (
                                  <span className="inline-flex items-center gap-1 text-xs opacity-50 font-medium">
                                    · <Clock className="w-3 h-3" /> {service.duration} min
                                  </span>
                                )}
                              </div>

                              {service.description && (
                                <p className="text-xs sm:text-sm opacity-65 leading-relaxed max-w-xl">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Side: Price + Instant Action Pill */}
                          <div className="flex items-center justify-between sm:justify-end gap-5 pl-0 sm:pl-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-current/5">
                            <div className="text-left sm:text-right">
                              {service.price ? (
                                <span className="font-display font-black text-xl sm:text-2xl tracking-tight">
                                  S/ {service.price}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold opacity-50">Consultar</span>
                              )}
                            </div>

                            {canBook && (
                              <BookingWidget
                                services={services}
                                businessId={business.id}
                                workingHours={settings?.workingHours}
                                blockedDates={settings?.blockedDates}
                                blockedHours={settings?.blockedHours}
                                initialServiceId={service.id.toString()}
                                triggerLabel="Reservar"
                                triggerClassName="h-10 px-5 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-900 hover:bg-red-600 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-red-500 dark:hover:text-white shadow-sm transition-all duration-200 group-hover:scale-105"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center border-y border-current/10">
                    <p className="opacity-50 text-sm">No encontramos servicios con "{serviceSearch}".</p>
                    <Button
                      variant="ghost"
                      onClick={() => setServiceSearch("")}
                      className="mt-2 text-xs font-semibold text-red-600"
                    >
                      Restablecer búsqueda
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* ═══ 02. GALERÍA VISUAL (Only shown when enabled and has images) ═══ */}
            {settings?.enableGallery && gallery.length > 0 && (activeTab === "all" || activeTab === "gallery") && (
              <section id="section-gallery" className="space-y-6 scroll-mt-24">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400 mb-1.5">
                      <span>02</span>
                      <span className="w-6 h-px bg-current opacity-40" />
                      <span>Portafolio & Espacio</span>
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                      Galería Visual
                    </h2>
                  </div>
                  <span className="text-xs font-semibold opacity-40 uppercase tracking-widest">
                    {gallery.length} capturas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {gallery.map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPhoto(item)}
                      className={`group relative overflow-hidden rounded-3xl cursor-pointer bg-black/5 dark:bg-white/5 ${
                        index === 0 ? "col-span-2 row-span-2 aspect-video sm:aspect-square" : "aspect-square"
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title || `Foto de ${business.name}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{item.title || "Ampliar imagen"}</p>
                          <Eye className="w-4 h-4 opacity-80" />
                        </div>
                        {item.description && <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}



            {/* ═══ 04. EDITORIAL STORY / SOBRE NOSOTROS (Magazine Quote Layout, No White Box) ═══ */}
            {(settings?.aboutUs || settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations) && (activeTab === "all" || activeTab === "about") && (
              <section id="section-about" className="space-y-6 scroll-mt-24 pt-4 border-t border-current/10">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400">
                  <span>03</span>
                  <span className="w-6 h-px bg-current opacity-40" />
                  <span>Nuestra Esencia</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  <div className="md:col-span-5">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                      El arte detrás de {business.name}
                    </h2>
                    {settings?.professionalTitle && (
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2">
                        {settings.professionalTitle}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-7 space-y-6">
                    {settings?.aboutUs ? (
                      <div
                        className="opacity-80 leading-relaxed space-y-4 text-base sm:text-lg font-light"
                        dangerouslySetInnerHTML={{ __html: settings.aboutUs.replace(/\n/g, "<br>") }}
                      />
                    ) : (
                      <p className="opacity-80 leading-relaxed text-base sm:text-lg font-light">
                        {settings?.publicDescription || business.description || "Comprometidos con brindarte la mejor experiencia, atención personalizada y los más altos estándares de calidad en cada visita."}
                      </p>
                    )}

                    {/* Open Editorial Badges */}
                    {(settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations) && (
                      <div className="flex flex-wrap gap-3 pt-2">
                        {settings?.professionalTitle && (
                          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
                            <GraduationCap className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs font-bold">{settings.professionalTitle}</span>
                          </div>
                        )}
                        {settings?.yearsOfExperience && (
                          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
                            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-xs font-bold">{settings.yearsOfExperience} años de experiencia</span>
                          </div>
                        )}
                        {settings?.specializations && (
                          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]">
                            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-bold">{settings.specializations}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ═══ 05. EDITORIAL VOICES / RESEÑAS (Open Typography Quotes, No White Box Wall) ═══ */}
            {(activeTab === "all" || activeTab === "reviews") && (
              <section id="section-reviews" className="space-y-8 scroll-mt-24 pt-4 border-t border-current/10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-amber-500 mb-1.5">
                      <span>04</span>
                      <span className="w-6 h-px bg-current opacity-40" />
                      <span>Testimonios Verificados</span>
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                      Lo que dicen nuestros clientes
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-display font-black">
                      {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
                    </div>
                    <div>
                      <StarRow rating={avgRating > 0 ? avgRating : 5} className="w-4 h-4" />
                      <p className="text-[11px] opacity-50">
                        {reviews.length} opiniones reales
                      </p>
                    </div>
                  </div>
                </div>

                {/* Open Editorial Quotes Grid */}
                {reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="relative pl-5 border-l-2 border-red-500/40 space-y-3 py-1"
                      >
                        <StarRow rating={rev.rating} className="w-3.5 h-3.5" />
                        {rev.comment && (
                          <p className="text-sm sm:text-base italic opacity-85 leading-relaxed font-light">
                            “{rev.comment}”
                          </p>
                        )}
                        <div className="flex items-center gap-2.5 pt-1">
                          <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                            {(rev.clientName || "C").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-xs tracking-wide">
                            {rev.clientName || "Cliente verificado"}
                          </span>
                          <span className="text-[10px] opacity-40 uppercase tracking-wider">· Verificado</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm opacity-50 italic">
                    Aún no hay testimonios publicados. ¡Sé el primero en compartir tu experiencia!
                  </p>
                )}

                {/* Minimalist Review Input */}
                {settings?.enableReviews && (
                  <div className="pt-6 border-t border-current/10 space-y-4">
                    <h3 className="font-display font-bold text-lg">
                      Deja tu valoración
                    </h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewStars(s)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                s <= reviewStars
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-neutral-200 text-neutral-300 dark:fill-neutral-800 dark:text-neutral-700"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="h-10 max-w-xs rounded-full bg-black/[0.04] dark:bg-white/[0.06] border-0 px-4 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Escribe brevemente cómo fue tu experiencia…"
                        className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-xs sm:text-sm flex-1"
                      />
                      <Button
                        onClick={submitReview}
                        disabled={isSubmittingReview}
                        className="h-auto py-3 px-6 rounded-2xl bg-neutral-900 hover:bg-red-600 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider shrink-0"
                      >
                        {isSubmittingReview ? "Enviando…" : "Publicar"}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ═══ 06. UBICACIÓN Y CONTACTO DIRECTO (Open Split Layout) ═══ */}
            {(activeTab === "all" || activeTab === "contact") && (
              <section id="section-contact" className="space-y-6 scroll-mt-24 pt-4 border-t border-current/10">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400">
                  <span>05</span>
                  <span className="w-6 h-px bg-current opacity-40" />
                  <span>Ubicación & Contacto</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  <div className="md:col-span-5 space-y-4">
                    <h2 className="font-display text-3xl font-bold tracking-tight">
                      Visítanos o escríbenos
                    </h2>
                    {address && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">Dirección</p>
                        <p className="font-semibold text-base">{address}</p>
                        {settings?.district && (
                          <p className="text-xs opacity-60">{settings.district}, {settings.region || "Perú"}</p>
                        )}
                      </div>
                    )}
                    {mapUrl && (
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-block pt-1">
                        <Button variant="outline" className="rounded-full text-xs font-bold uppercase tracking-wider h-10 px-5 gap-2 border-current/20">
                          <Navigation className="w-3.5 h-3.5 text-red-500" />
                          Cómo llegar en Google Maps
                        </Button>
                      </a>
                    )}
                  </div>

                  {settings?.enableContactForm && (
                    <div className="md:col-span-7 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">
                        Consulta Directa
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Tu nombre"
                          className="h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-xs sm:text-sm"
                        />
                        <Input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="Tu correo electrónico"
                          className="h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-xs sm:text-sm"
                        />
                      </div>
                      <Textarea
                        rows={3}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="¿En qué podemos ayudarte?"
                        className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-xs sm:text-sm"
                      />
                      <Button
                        onClick={submitContact}
                        disabled={isSubmittingContact}
                        className="h-11 px-6 rounded-full bg-neutral-900 hover:bg-red-600 text-white dark:bg-white dark:text-neutral-950 font-bold text-xs uppercase tracking-wider gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSubmittingContact ? "Enviando…" : "Enviar consulta"}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ═══ 06. SOCIAL MEDIA FEED SHOWCASE (Instagram / TikTok / Facebook) - FINAL SECTION ═══ */}
            {hasSocialFeedShowcase && (activeTab === "all" || activeTab === "social") && (
              <section id="section-social" className="space-y-6 scroll-mt-24 pt-4 border-t border-current/10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-pink-600 dark:text-pink-400 mb-1.5">
                      <span>06</span>
                      <span className="w-6 h-px bg-current opacity-40" />
                      <span>Social Hub en Vivo</span>
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
                      Síguenos en Redes
                    </h2>
                  </div>

                  {/* Platform Switcher Pills */}
                  {activeSocialChannels.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setActiveSocialFilter("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          activeSocialFilter === "all"
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100"
                        }`}
                      >
                        Todas
                      </button>
                      {activeSocialChannels.map((ch) => {
                        const ChIcon = ch.icon;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => setActiveSocialFilter(ch.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              activeSocialFilter === ch.id
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <ChIcon className="w-3.5 h-3.5" />
                            <span>{ch.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Featured Reels / TikToks / Posts if configured */}
                {customSocialPosts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {customSocialPosts
                      .filter((p) => activeSocialFilter === "all" || p.platform === activeSocialFilter)
                      .map((post) => {
                        const isIG = post.platform === "instagram";
                        const isTT = post.platform === "tiktok";
                        const PlatIcon = isIG ? Instagram : isTT ? Music2 : Facebook;
                        const gradient = isIG
                          ? "from-pink-600 via-red-500 to-amber-500"
                          : isTT
                          ? "from-neutral-950 via-neutral-900 to-cyan-600"
                          : "from-blue-600 to-indigo-700";

                        return (
                          <a
                            key={post.id}
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-[4/5] rounded-3xl overflow-hidden flex flex-col justify-between p-5 text-white shadow-lg hover:-translate-y-1 transition-all duration-300"
                          >
                            {post.thumbnailUrl ? (
                              <img
                                src={post.thumbnailUrl}
                                alt={post.caption || post.platform}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-95`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                            <div className="relative z-10 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider">
                                <PlatIcon className="w-3.5 h-3.5" />
                                {post.platform}
                              </span>
                              <ExternalLink className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>

                            <div className="relative z-10 space-y-2">
                              <p className="font-display font-bold text-base leading-snug line-clamp-2">
                                {post.caption || `Ver publicación en ${post.platform}`}
                              </p>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 group-hover:text-white">
                                Reproducir contenido <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </a>
                        );
                      })}
                  </div>
                )}

                {/* Interactive Channel Showcase Banners (Instagram / TikTok / Facebook) */}
                {activeSocialChannels.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {activeSocialChannels
                      .filter((ch) => activeSocialFilter === "all" || ch.id === activeSocialFilter)
                      .map((ch) => {
                        const ChIcon = ch.icon;
                        const handle = ch.url
                          .replace(/^https?:\/\/(www\.)?(instagram|tiktok|facebook)\.com\/?/i, "")
                          .replace(/\/$/, "");
                        return (
                          <a
                            key={ch.id}
                            href={ch.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${ch.gradient} shadow-lg group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[160px]`}
                          >
                            <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-500">
                              <ChIcon className="w-32 h-32" />
                            </div>

                            <div className="relative z-10 flex items-center justify-between">
                              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <ChIcon className="w-5 h-5" />
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-widest bg-black/20 backdrop-blur-md px-3 py-1 rounded-full">
                                Oficial
                              </span>
                            </div>

                            <div className="relative z-10 mt-6">
                              <p className="text-xs text-white/80 font-medium">
                                {ch.id === "instagram"
                                  ? "Reels, historias y trabajos"
                                  : ch.id === "tiktok"
                                  ? "Videos y transformaciones"
                                  : "Comunidad y novedades"}
                              </p>
                              <h3 className="font-display font-bold text-lg truncate mt-0.5">
                                {handle ? `@${handle.replace(/^@/, "")}` : ch.label}
                              </h3>
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold mt-2 group-hover:underline">
                                Ver feed en {ch.label}
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </div>
                          </a>
                        );
                      })}
                  </div>
                )}
              </section>
            )}

          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT AREA: UNIFIED STICKY CONCIERGE DOCK (Single sleek dock!)
             ══════════════════════════════════════════════════════════ */}
          <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-[2rem] bg-neutral-950 text-white p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
              {/* Subtle ambient top glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                    Concierge de Reservas
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-0.5 rounded-full ${
                      isOpenNow
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow ? "bg-emerald-400 animate-pulse" : "bg-white/40"}`} />
                    {isOpenNow ? "Atendiendo hoy" : "Cerrado"}
                  </span>
                </div>

                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  Agenda tu cita
                </h3>

                {lowestPrice && (
                  <p className="text-xs text-white/60">
                    Experiencias disponibles desde <span className="text-white font-bold">S/ {lowestPrice.toFixed(2)}</span>
                  </p>
                )}
              </div>

              {/* Primary Booking Trigger */}
              {canBook ? (
                <div className="relative z-10">
                  <BookingWidget
                    services={services}
                    businessId={business.id}
                    workingHours={settings?.workingHours}
                    blockedDates={settings?.blockedDates}
                    blockedHours={settings?.blockedHours}
                    triggerLabel="Reservar Cita Ahora"
                    triggerClassName="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01]"
                  />
                </div>
              ) : (
                <div className="bg-white/5 p-4 rounded-2xl text-center">
                  <p className="text-xs text-white/60">
                    Agenda directa por WhatsApp disponible.
                  </p>
                </div>
              )}

              {/* Instant Perks */}
              <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Confirmación inmediata por WhatsApp</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Reserva gratis y elige tu horario ideal</span>
                </div>
              </div>

              {/* Integrated Schedule Accordion inside the same dock */}
              {hoursRows.length > 0 && (
                <div className="border-t border-white/10 pt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAllHours(!showAllHours)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-white/90 hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Hoy: {todayRow?.text || "Cerrado"}</span>
                    </span>
                    <span className="text-white/50 flex items-center gap-1 text-[11px]">
                      {showAllHours ? "Ocultar" : "Ver semana"}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllHours ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {showAllHours && (
                    <div className="space-y-1.5 pt-2 text-xs">
                      {hoursRows.map((r) => {
                        const isToday = r.day === todayKey();
                        return (
                          <div
                            key={r.day}
                            className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                              isToday ? "bg-white/10 font-bold text-amber-300" : "text-white/60"
                            }`}
                          >
                            <span>{r.label}</span>
                            <span>{r.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Popular Times (ONLY rendered if non-empty cells actually exist) */}
              {popularTimesResponse?.cells && popularTimesResponse.cells.some((c) => c.popularity > 0) && (
                <div className="border-t border-white/10 pt-5">
                  <PopularTimes data={popularTimesData} />
                </div>
              )}

              {/* Direct Channels & Social Icons inside the same unified dock */}
              <div className="border-t border-white/10 pt-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {phone && (
                    <a
                      href={whatsappLink(phone, business.name)}
                      onClick={() => trackEvent("whatsapp_click")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      WhatsApp
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Llamar
                    </a>
                  )}
                </div>

                {socials.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Redes Oficiales
                    </span>
                    <div className="flex items-center gap-1.5">
                      {socials.map((s) => {
                        const SIcon = s.icon;
                        return (
                          <a
                            key={s.label}
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={s.label}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                          >
                            <SIcon className="w-3.5 h-3.5" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
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
