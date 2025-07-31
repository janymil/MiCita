import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
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
import { applyMicrositioTheme, type MicrositioThemeId } from "@/lib/micrositio-themes";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();

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

  const { business, settings, services, gallery, reviews } = micrositeData || {};
  const categoryInfo = categories.find(c => c.id === business.category);

  // Apply the micrositio theme
  useEffect(() => {
    const theme = (settings?.micrositioTheme as MicrositioThemeId) || 'moderno';
    applyMicrositioTheme(theme);
    
    // Cleanup function to reset theme when component unmounts
    return () => {
      document.documentElement.classList.remove('micrositio-modern', 'micrositio-flat', 'micrositio-glassmorphism', 'micrositio-cyberpunk');
    };
  }, [settings?.micrositioTheme]);

  return (
    <div className="micrositio-container min-h-screen">
      {/* Header */}
      <header className="micrositio-card border-0 border-b sticky top-0 z-50 rounded-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <div className="relative group">
                  <img 
                    src={settings.profileImage} 
                    alt={business.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center text-white font-bold text-xl shadow-lg hover:scale-105 transition-transform duration-300">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 hover:text-red-600 transition-colors duration-300">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-gray-600 font-medium">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge variant="secondary" className="mt-1 bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 border border-gray-200 hover:shadow-md transition-shadow duration-300">
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {settings?.publicPhone && (
                <button className="micrositio-btn">
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </button>
              )}
              {settings?.enablePublicBooking && (
                <button className="micrositio-btn">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reservar Cita
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {settings?.coverImage && (
        <div className="h-64 md:h-80 bg-gradient-to-r from-gray-200 to-gray-300 relative overflow-hidden group">
          <img 
            src={settings.coverImage} 
            alt="Portada"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm font-medium opacity-90">📸 Galería de {business.name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <div className="micrositio-card p-6">
              <h2 className="text-xl font-bold mb-4">
                🏢 Acerca de nosotros
              </h2>
              <p className="micrositio-text-secondary leading-relaxed text-base">
                {settings?.publicDescription || business.description || "Información no disponible."}
              </p>
            </div>

            {/* Services */}
            {services && services.length > 0 && (
              <div className="micrositio-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  ⚡ Nuestros Servicios
                  <Badge variant="outline" className="ml-3">
                    {services.length} servicios
                  </Badge>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="micrositio-card p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <span className="font-bold text-lg">
                          S/ {service.price}
                        </span>
                      </div>
                      {service.description && (
                        <p className="micrositio-text-secondary text-sm mb-3 leading-relaxed">{service.description}</p>
                      )}
                      <div className="flex items-center text-sm micrositio-text-secondary">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <div className="micrositio-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  📸 Galería de Trabajos
                  <Badge variant="outline" className="ml-3">
                    {gallery.length} fotos
                  </Badge>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title || "Trabajo"}
                        className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          console.log('🚨 Gallery image failed to load:', item.imageUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('✅ Gallery image loaded successfully:', item.imageUrl.substring(0, 50) + '...');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {item.title && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl">
                          <p className="text-white text-sm font-medium text-center px-2">{item.title}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
              <div className="micrositio-card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  ⭐ Reseñas de Clientes
                  {reviews && reviews.length > 0 && (
                    <Badge variant="outline" className="ml-3">
                      {reviews.length} reseñas
                    </Badge>
                  )}
                </h2>
                {/* Existing Reviews */}
                {reviews && reviews.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="micrositio-card p-4">
                        <div className="flex items-center mb-3">
                          <div className="flex mr-3">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors duration-300`} 
                              />
                            ))}
                          </div>
                          <span className="font-medium">{review.clientName}</span>
                          <div className="ml-auto text-xs micrositio-text-secondary px-2 py-1 rounded-full">
                            {review.source === 'scraped' ? '🌐 Google Maps' : '💬 Micrositio'}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="micrositio-text-secondary italic leading-relaxed">"{review.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Review Submission Form */}
                {settings?.enableReviews && (
                  <div className="border-t border-gray-200/50 pt-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-500" />
                      Deja tu reseña
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="review-name" className="font-medium">Tu nombre</Label>
                        <Input 
                          id="review-name" 
                          placeholder="Tu nombre completo" 
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="font-medium mb-2 block">Calificación</Label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className="w-6 h-6 cursor-pointer text-gray-300 hover:text-yellow-400 transition-colors duration-200"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review-comment" className="font-medium">Tu experiencia</Label>
                        <Textarea 
                          id="review-comment" 
                          placeholder="Cuéntanos sobre tu experiencia con este negocio..." 
                          rows={4} 
                          className="mt-1"
                        />
                      </div>
                      <button className="micrositio-btn w-full py-3">
                        ⭐ Enviar Reseña
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="micrositio-card p-6">
              <h3 className="text-lg font-bold mb-4">
                📞 Información de Contacto
              </h3>
              <div className="space-y-4">
                {(settings?.publicPhone || business?.phone) && (
                  <div className="flex items-center p-3 rounded-lg hover:shadow-md transition-all duration-300">
                    <Phone className="w-4 h-4 mr-3" />
                    <span className="group-hover/contact:text-green-700 transition-colors duration-300">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}

                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg hover:shadow-md transition-all duration-300 group/contact">
                    <Mail className="w-4 h-4 mr-3 text-blue-600" />
                    <span className="group-hover/contact:text-blue-700 transition-colors duration-300">{settings?.publicEmail || business.email}</span>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-all duration-300 group/contact">
                    <MapPin className="w-4 h-4 mr-3 text-purple-600 mt-1" />
                    <div className="group-hover/contact:text-purple-700 transition-colors duration-300">
                      {settings?.streetAddress ? (
                        <>
                          <p className="font-medium">{settings.streetAddress}</p>
                          {settings.district && <p className="text-sm text-gray-600">{settings.district}</p>}
                          {settings.region && <p className="text-sm text-gray-600">{settings.region}</p>}
                          {settings.postalCode && <p className="text-sm text-gray-600">{settings.postalCode}</p>}
                          {settings.country && <p className="text-sm text-gray-600">{settings.country}</p>}
                        </>
                      ) : (
                        <p>{business.address}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Media Links */}
                {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
                  <div>
                    <div className="border-t border-gray-200/50 pt-4 mt-4">
                      <Label className="text-sm text-gray-700 mb-3 block font-semibold">🌐 Redes Sociales</Label>
                      <div className="flex space-x-3 flex-wrap gap-2">
                        {settings?.facebookUrl && (
                          <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" 
                             className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.instagramUrl && (
                          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" 
                             className="p-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.tiktokUrl && (
                          <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" 
                             className="p-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl hover:from-black hover:to-gray-800 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.youtubeUrl && (
                          <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" 
                             className="p-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div className="micrositio-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                🕐 Horarios
              </h3>
              <div>
                {/* Priority 1: Use scraped business hours if available */}
                {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
                  <div className="space-y-3">
                    {/* Handle both array format (legacy) and object format (new) */}
                    {Array.isArray(business.hours) 
                      ? business.hours.map((hourString, index) => {
                          // Parse hour strings like "Monday: 9:00 AM – 9:00 PM"
                          const parts = hourString.split(':');
                          if (parts.length < 2) return null;
                          
                          const day = parts[0].trim();
                          const timeRange = parts.slice(1).join(':').trim();
                          
                          const isOpen = !timeRange.toLowerCase().includes('closed') && !timeRange.toLowerCase().includes('cerrado');
                          
                          // Map English day names to Spanish
                          const dayMap: { [key: string]: { label: string; emoji: string } } = {
                            'monday': { label: 'Lunes', emoji: '📅' },
                            'tuesday': { label: 'Martes', emoji: '📅' },
                            'wednesday': { label: 'Miércoles', emoji: '📅' },
                            'thursday': { label: 'Jueves', emoji: '📅' },
                            'friday': { label: 'Viernes', emoji: '📅' },
                            'saturday': { label: 'Sábado', emoji: '🎯' },
                            'sunday': { label: 'Domingo', emoji: '🌞' }
                          };
                          
                          const dayKey = day.toLowerCase();
                          const dayInfo = dayMap[dayKey] || { label: day, emoji: '📅' };
                          
                          return (
                            <div key={index} className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                              isOpen 
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md' 
                                : 'bg-gradient-to-r from-gray-50 to-gray-100'
                            }`}>
                              <span className="capitalize font-medium flex items-center text-gray-900">
                                <span className="mr-2">{dayInfo.emoji}</span>
                                {dayInfo.label}:
                              </span>
                              <span className={`font-semibold px-2 py-1 rounded-md ${
                                isOpen 
                                  ? 'text-green-700 bg-green-100' 
                                  : 'text-gray-500 bg-gray-200 italic'
                              }`}>
                                {isOpen ? timeRange : 'Cerrado'}
                              </span>
                            </div>
                          );
                        })
                      : Object.entries(business.hours).map(([dayKey, schedule]: [string, any]) => {
                          // Handle object format like { lunes: { open: "09:00", close: "17:00", closed: false } }
                          const dayMap: { [key: string]: { label: string; emoji: string } } = {
                            'lunes': { label: 'Lunes', emoji: '📅' },
                            'martes': { label: 'Martes', emoji: '📅' },
                            'miercoles': { label: 'Miércoles', emoji: '📅' },
                            'jueves': { label: 'Jueves', emoji: '📅' },
                            'viernes': { label: 'Viernes', emoji: '📅' },
                            'sabado': { label: 'Sábado', emoji: '🎯' },
                            'domingo': { label: 'Domingo', emoji: '🌞' },
                            'monday': { label: 'Lunes', emoji: '📅' },
                            'tuesday': { label: 'Martes', emoji: '📅' },
                            'wednesday': { label: 'Miércoles', emoji: '📅' },
                            'thursday': { label: 'Jueves', emoji: '📅' },
                            'friday': { label: 'Viernes', emoji: '📅' },
                            'saturday': { label: 'Sábado', emoji: '🎯' },
                            'sunday': { label: 'Domingo', emoji: '🌞' }
                          };
                          
                          const dayInfo = dayMap[dayKey.toLowerCase()] || { label: dayKey, emoji: '📅' };
                          const isOpen = schedule && !schedule.closed && schedule.open && schedule.close;
                          
                          return (
                            <div key={dayKey} className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                              isOpen 
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md' 
                                : 'bg-gradient-to-r from-gray-50 to-gray-100'
                            }`}>
                              <span className="capitalize font-medium flex items-center text-gray-900">
                                <span className="mr-2">{dayInfo.emoji}</span>
                                {dayInfo.label}:
                              </span>
                              <span className={`font-semibold px-2 py-1 rounded-md ${
                                isOpen 
                                  ? 'text-green-700 bg-green-100' 
                                  : 'text-gray-500 bg-gray-200 italic'
                              }`}>
                                {isOpen ? `${schedule.open} - ${schedule.close}` : 'Cerrado'}
                              </span>
                            </div>
                          );
                        })
                    }
                  </div>
                ) : 
                /* Priority 2: Fallback to microsite working hours settings */
                settings?.workingHours ? (
                  <div className="space-y-3">
                    {[
                      { key: 'monday', label: 'Lunes', emoji: '📅' },
                      { key: 'tuesday', label: 'Martes', emoji: '📅' },
                      { key: 'wednesday', label: 'Miércoles', emoji: '📅' },
                      { key: 'thursday', label: 'Jueves', emoji: '📅' },
                      { key: 'friday', label: 'Viernes', emoji: '📅' },
                      { key: 'saturday', label: 'Sábado', emoji: '🎯' },
                      { key: 'sunday', label: 'Domingo', emoji: '🌞' }
                    ].map(({ key, label, emoji }) => {
                      const hours = settings.workingHours[key];
                      if (!hours) return null;
                      
                      return (
                        <div key={key} className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                          hours.enabled 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md' 
                            : 'bg-gradient-to-r from-gray-50 to-gray-100'
                        }`}>
                          <span className="capitalize font-medium flex items-center text-gray-900">
                            <span className="mr-2">{emoji}</span>
                            {label}:
                          </span>
                          <span className={`font-semibold px-2 py-1 rounded-md ${
                            hours.enabled 
                              ? 'text-green-700 bg-green-100'
                              : 'text-gray-500 bg-gray-200 italic'
                          }`}>
                            {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Horarios no disponibles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Widget */}
            {settings?.enablePublicBooking && (
              <div className="micrositio-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  📅 Reserva tu Cita
                </h3>
                <BookingWidget businessId={business?.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}