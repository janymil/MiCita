import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare, Palette } from "lucide-react";
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

  const { business, settings, services, gallery, reviews } = micrositeData || {};
  const categoryInfo = categories.find(c => c.id === business.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Modern Hero Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-2xl border-b border-gray-200/30 sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <div className="relative group">
                  <img 
                    src={settings.profileImage} 
                    alt={business.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-2xl group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl hover:scale-110 transition-transform duration-500 ring-4 ring-white/50">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-purple-600 hover:to-pink-600 transition-all duration-500">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-gray-700 font-semibold bg-gray-100 px-3 py-1 rounded-full text-sm">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge variant="secondary" className="mt-1 bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 border border-gray-200 hover:shadow-md transition-shadow duration-300">
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsThemeSelectorOpen(true)}
                className="border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
              >
                <Palette className="w-4 h-4 mr-2 text-purple-600" />
                Temas
              </Button>
              {settings?.publicPhone && (
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-700 hover:from-emerald-600 hover:via-green-700 hover:to-emerald-800 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 rounded-2xl px-6 py-3">
                  <Phone className="w-5 h-5 mr-2" />
                  Llamar Ahora
                </Button>
              )}
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 hover:from-purple-600 hover:via-pink-700 hover:to-red-700 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 rounded-2xl px-6 py-3">
                  <Calendar className="w-5 h-5 mr-2" />
                  Reservar Cita
                </Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group rounded-3xl overflow-hidden">
              <CardHeader className="pb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-500">
                  🏢 Acerca de nosotros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <p className="text-gray-700 leading-relaxed text-lg font-medium">
                  {settings?.publicDescription || business.description || "Información no disponible."}
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group rounded-3xl overflow-hidden">
                <CardHeader className="pb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent group-hover:from-teal-600 group-hover:to-cyan-600 transition-all duration-500 flex items-center">
                    ⚡ Nuestros Servicios
                    <Badge variant="outline" className="ml-4 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200 px-3 py-1 text-sm font-semibold">
                      {services.length} servicios
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <div key={service.id} className="border-0 rounded-2xl p-6 bg-gradient-to-br from-white/80 to-gray-50/60 backdrop-blur-md hover:from-white/90 hover:to-gray-50/80 hover:shadow-xl transition-all duration-400 group/service transform hover:scale-105">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 group-hover/service:text-red-600 transition-colors duration-300">{service.name}</h3>
                          <span className="text-red-600 font-bold text-lg bg-gradient-to-r from-red-50 to-pink-50 px-2 py-1 rounded-lg">
                            S/ {service.price}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{service.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500 bg-gray-50/50 rounded-lg px-2 py-1">
                          <Clock className="w-4 h-4 mr-1 text-blue-500" />
                          {service.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300 flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-blue-500" />
                    📸 Galería de Trabajos
                    <Badge variant="outline" className="ml-3 bg-gradient-to-r from-blue-50 to-purple-50">
                      {gallery.length} fotos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item) => (
                      <div key={item.id} className="relative group/gallery overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || "Trabajo"}
                          className="w-full h-32 object-cover transition-transform duration-500 group-hover/gallery:scale-110"
                          onError={(e) => {
                            console.log('🚨 Gallery image failed to load:', item.imageUrl);
                            // Hide broken images
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            // You could also set a fallback image:
                            // target.src = '/placeholder-image.jpg';
                          }}
                          onLoad={() => {
                            console.log('✅ Gallery image loaded successfully:', item.imageUrl.substring(0, 50) + '...');
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300" />
                        {item.title && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl">
                            <p className="text-white text-sm font-medium text-center px-2">{item.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300 flex items-center">
                    ⭐ Reseñas de Clientes
                    {reviews && reviews.length > 0 && (
                      <Badge variant="outline" className="ml-3 bg-gradient-to-r from-yellow-50 to-orange-50">
                        {reviews.length} reseñas
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Existing Reviews */}
                  {reviews && reviews.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-100/50 pb-4 last:border-b-0 bg-gradient-to-r from-gray-50/50 to-white/50 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                          <div className="flex items-center mb-3">
                            <div className="flex mr-3">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors duration-300`} 
                                />
                              ))}
                            </div>
                            <span className="font-medium text-gray-900">{review.clientName}</span>
                            <div className="ml-auto text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full">
                              {review.source === 'scraped' ? '🌐 Google Maps' : '💬 Micrositio'}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-600 italic leading-relaxed">"{review.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review Submission Form */}
                  {settings?.enableReviews && (
                    <div className="border-t border-gray-200/50 pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Star className="w-5 h-5 mr-2 text-yellow-500" />
                        Deja tu reseña
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="review-name" className="text-gray-700 font-medium">Tu nombre</Label>
                          <Input 
                            id="review-name" 
                            placeholder="Tu nombre completo" 
                            className="mt-1 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 transition-colors duration-300"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-700 font-medium mb-2 block">Calificación</Label>
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
                          <Label htmlFor="review-comment" className="text-gray-700 font-medium">Tu experiencia</Label>
                          <Textarea 
                            id="review-comment" 
                            placeholder="Cuéntanos sobre tu experiencia con este negocio..." 
                            rows={4} 
                            className="mt-1 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500 transition-colors duration-300"
                          />
                        </div>
                        <Button className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3">
                          ⭐ Enviar Reseña
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300">
                  📞 Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:shadow-md transition-all duration-300 group/contact">
                    <Phone className="w-4 h-4 mr-3 text-green-600" />
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
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group rounded-3xl overflow-hidden">
              <CardHeader className="pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-500 flex items-center">
                  <Clock className="w-6 h-6 mr-3 text-blue-500" />
                  🕐 Horarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
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
                      { dayIndex: '1', label: 'Lunes', emoji: '📅' },
                      { dayIndex: '2', label: 'Martes', emoji: '📅' },
                      { dayIndex: '3', label: 'Miércoles', emoji: '📅' },
                      { dayIndex: '4', label: 'Jueves', emoji: '📅' },
                      { dayIndex: '5', label: 'Viernes', emoji: '📅' },
                      { dayIndex: '6', label: 'Sábado', emoji: '🎯' },
                      { dayIndex: '0', label: 'Domingo', emoji: '🌞' }
                    ].map(({ dayIndex, label, emoji }) => {
                      const hours = settings.workingHours[dayIndex];
                      if (!hours) return null;
                      
                      return (
                        <div key={dayIndex} className={`flex justify-between items-center p-4 rounded-2xl transition-all duration-400 transform hover:scale-102 ${
                          hours.enabled 
                            ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 hover:shadow-lg border border-green-100' 
                            : 'bg-gradient-to-r from-gray-50/80 to-gray-100/80 border border-gray-200'
                        }`}>
                          <span className="capitalize font-semibold flex items-center text-gray-900 text-lg">
                            <span className="mr-3 text-xl">{emoji}</span>
                            {label}:
                          </span>
                          <span className={`font-bold px-4 py-2 rounded-xl text-lg ${
                            hours.enabled 
                              ? 'text-green-700 bg-gradient-to-r from-green-100 to-emerald-100' 
                              : 'text-gray-500 bg-gradient-to-r from-gray-100 to-gray-200 italic'
                          }`}>
                            {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <p className="text-gray-600">⏰ Horarios no disponibles</p>
                  </div>
                )}

                {settings?.scheduleNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{settings.scheduleNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Síguenos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
                    {settings?.facebookUrl && (
                      <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Facebook className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {settings?.instagramUrl && (
                      <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Instagram className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {settings?.tiktokUrl && (
                      <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {settings?.youtubeUrl && (
                      <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Youtube className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Widget */}
            {settings?.enablePublicBooking && services && services.length > 0 && (
              <BookingWidget 
                services={services} 
                businessId={business.id}
                workingHours={settings?.workingHours}
                blockedDates={settings?.blockedDates}
                blockedHours={settings?.blockedHours}
              />
            )}

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                    💬 Enviar Mensaje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name" className="text-gray-700 font-medium">Nombre</Label>
                    <Input 
                      id="contact-name" 
                      placeholder="Tu nombre" 
                      className="mt-1 border-gray-300 focus:border-red-500 focus:ring-red-500 transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email" className="text-gray-700 font-medium">Email</Label>
                    <Input 
                      id="contact-email" 
                      type="email" 
                      placeholder="tu@email.com" 
                      className="mt-1 border-gray-300 focus:border-red-500 focus:ring-red-500 transition-colors duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-message" className="text-gray-700 font-medium">Mensaje</Label>
                    <Textarea 
                      id="contact-message" 
                      placeholder="Escribe tu mensaje..." 
                      rows={4} 
                      className="mt-1 border-gray-300 focus:border-red-500 focus:ring-red-500 transition-colors duration-300"
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3">
                    📧 Enviar Mensaje
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/20 mr-3"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg mr-3">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="text-xl font-bold">{business.name}</h3>
            </div>
            <p className="text-gray-300 mb-4">
              {settings?.professionalTitle || "Servicio profesional de calidad"}
            </p>
            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-400 text-sm">
                © 2025 {business.name}. Todos los derechos reservados.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                ⚡ Powered by BusinessSearchPlatform
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Theme Selector Modal */}
      <MicrositeThemeSelector 
        isOpen={isThemeSelectorOpen} 
        onClose={() => setIsThemeSelectorOpen(false)} 
      />
    </div>
  );
}