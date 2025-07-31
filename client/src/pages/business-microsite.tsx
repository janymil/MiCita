import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicrositeSkeletonLoader } from "@/components/ui/skeleton";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { formatDatePeruvian } from "@/lib/utils";
import { useMicrositeTheme } from "@/contexts/MicrositeThemeContext";
import MicrositeThemeSelector from "@/components/microsite-theme-selector";
import BrutalistTheme from "@/components/microsite-themes/BrutalistTheme";
import CyberpunkTheme from "@/components/microsite-themes/CyberpunkTheme";
import BentoTheme from "@/components/microsite-themes/BentoTheme";
import GlassmorphismTheme from "@/components/microsite-themes/GlassmorphismTheme";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useMicrositeTheme();
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  console.log("BusinessMicrosite: slug =", slug);

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: Boolean(slug),
  });

  console.log("BusinessMicrosite: micrositeData =", micrositeData);
  console.log("BusinessMicrosite: isLoading =", isLoading);
  console.log("BusinessMicrosite: error =", error);

  if (isLoading) {
    return <MicrositeSkeletonLoader />;
  }

  if (error || !micrositeData) {
    // If the slug doesn't match any business, show 404 or redirect to home
    // This prevents showing business microsite for system routes like /dashboard
    if (slug && (slug.startsWith('dashboard') || slug === 'login' || slug === 'registro' || slug === 'business' || slug === 'buscar')) {
      return null; // Let the router handle these routes normally
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Negocio no encontrado</h1>
          <p className="text-gray-600 mb-4">El micrositio que buscas no existe o no está disponible.</p>
          <Button onClick={() => window.location.href = "/"}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const { business, settings, services, gallery, reviews } = micrositeData;
  const categoryInfo = categories.find(c => c.id === business.category);

  // Theme Component Props
  const themeProps = {
    business,
    settings,
    services,
    gallery,
    reviews,
    isThemeSelectorOpen,
    setIsThemeSelectorOpen
  };

  // Render theme-specific layout
  const renderThemeLayout = () => {
    switch (theme) {
      case 'brutalist':
        return <BrutalistTheme {...themeProps} />;
      case 'cyberpunk':
        return <CyberpunkTheme {...themeProps} />;
      case 'bento':
        return <BentoTheme {...themeProps} />;
      case 'glassmorphism':
      default:
        return <GlassmorphismTheme {...themeProps} />;
    }
  };

  return (
    <>
      {renderThemeLayout()}
      <MicrositeThemeSelector 
        isOpen={isThemeSelectorOpen} 
        onClose={() => setIsThemeSelectorOpen(false)} 
      />
    </>
  );
}
