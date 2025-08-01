import BookingWidget from "@/components/booking-widget";
import MicrositeThemeSelector from "@/components/microsite-theme-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MicrositeSkeletonLoader } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMicrositeTheme } from "@/contexts/MicrositeThemeContext";
import { categories } from "@/lib/constants";
import { getThemeClasses } from "@/lib/microsite-themes";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Camera, Clock, Mail, MapPin, MessageSquare, Palette, Phone, Star } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";

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
  const themeConfig = getThemeClasses(theme);

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      {/* Modern Hero Header */}
      <header className={`${themeConfig.header} sticky top-0 z-50 transition-all duration-300`}>
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
                <Button size="lg" className={`${themeConfig.button}`}>
                  <Phone className="w-5 h-5 mr-2" />
                  Llamar Ahora
                </Button>
              )}
              {settings?.enablePublicBooking && (
                <Button size="lg" className={`${themeConfig.button}`}>
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
        {/* Enhanced Hero Section */}
        {(settings?.publicDescription || business.description) && (
          <div className="mb-12">
            <Card className={`${themeConfig.card} ${themeConfig.effects} group`}>
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  Bienvenido a {business.name}
                </h2>
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  {settings?.publicDescription || business.description}
                </p>
                {(settings?.publicPhone || settings?.enablePublicBooking) && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                    {settings?.publicPhone && (
                      <Button size="lg" className={`${themeConfig.button} px-8 py-3`}>
                        <Phone className="w-5 h-5 mr-2" />
                        Llamar Ahora
                      </Button>
                    )}
                    {settings?.enablePublicBooking && (
                      <Button size="lg" className={`${themeConfig.button} px-8 py-3`}>
                        <Calendar className="w-5 h-5 mr-2" />
                        Reservar Cita
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-8">
            {/* Services */}
            {services && services.length > 0 && (
              <Card className={`${themeConfig.card} ${themeConfig.effects}`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center justify-between">
                    <span className="flex items-center">
                      ⚡ Nuestros Servicios
                    </span>
                    <Badge variant="outline" className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200 px-4 py-2 text-lg font-bold">
                      {services.length} servicios disponibles
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div key={service.id} className="border-0 rounded-2xl p-6 bg-gradient-to-br from-white/90 to-gray-50/70 backdrop-blur-md border border-gray-100/50">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-xl text-gray-900 leading-tight">{service.name}</h3>
                          <span className="text-emerald-600 font-bold text-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 rounded-xl border border-emerald-200">
                            S/ {service.price}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{service.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500 bg-gray-50/70 rounded-lg px-3 py-2">
                            <Clock className="w-4 h-4 mr-2 text-blue-500" />
                            {service.duration} minutos
                          </div>
                          {settings?.enablePublicBooking && (
                            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-cyan-600 text-white">
                              Reservar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Calendar Section - New Enhanced Booking Section */}
            {settings?.enablePublicBooking && services && services.length > 0 && (
              <Card className={`${themeConfig.card} ${themeConfig.effects}`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
                    <Calendar className="w-8 h-8 mr-4 text-blue-500" />
                    📅 Agendar Cita
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-lg">Selecciona el servicio y horario que mejor se adapte a ti</p>
                </CardHeader>
                <CardContent className="p-8">
                  <BookingWidget
                    services={services}
                    businessId={business.id}
                    workingHours={settings?.workingHours}
                    blockedDates={settings?.blockedDates}
                    blockedHours={settings?.blockedHours}
                  />
                </CardContent>
              </Card>
            )}

            {/* About Section - Enhanced */}
            {(settings?.aboutUs || settings?.publicDescription || business.description) && (
              <Card className={`${themeConfig.card} ${themeConfig.effects}`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    🏢 Acerca de Nosotros
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                    {settings?.aboutUs ? (
                      <div dangerouslySetInnerHTML={{ __html: settings.aboutUs.replace(/\n/g, '<br>') }} />
                    ) : (
                      <p className="text-xl">
                        {settings?.publicDescription || business.description || "Información no disponible."}
                      </p>
                    )}
                  </div>

                  {/* Professional Credentials */}
                  {(settings?.professionalTitle || settings?.yearsOfExperience || settings?.specializations) && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        🎓 Información Profesional
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {settings?.professionalTitle && (
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                            <div className="text-2xl mb-2">👨‍💼</div>
                            <div className="font-semibold text-gray-900">{settings.professionalTitle}</div>
                            <div className="text-sm text-gray-600">Título Profesional</div>
                          </div>
                        )}
                        {settings?.yearsOfExperience && (
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                            <div className="text-2xl mb-2">⭐</div>
                            <div className="font-semibold text-gray-900">{settings.yearsOfExperience} años</div>
                            <div className="text-sm text-gray-600">de Experiencia</div>
                          </div>
                        )}
                        {settings?.specializations && (
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-100">
                            <div className="text-2xl mb-2">🔧</div>
                            <div className="font-semibold text-gray-900">Especialista</div>
                            <div className="text-sm text-gray-600">{settings.specializations}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Gallery - Enhanced */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <Card className={`${themeConfig.card} ${themeConfig.effects}`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center justify-between">
                    <span className="flex items-center">
                      <Camera className="w-8 h-8 mr-4 text-pink-500" />
                      📸 Galería de Trabajos
                    </span>
                    <Badge variant="outline" className="bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border-pink-200 px-4 py-2 text-lg font-bold">
                      {gallery.length} fotos
                    </Badge>
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-lg">Conoce nuestros trabajos y proyectos realizados</p>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {gallery.map((item) => (
                      <div key={item.id} className="relative overflow-hidden rounded-2xl shadow-lg">
                        <div className="aspect-square">
                          <img
                            src={item.imageUrl}
                            alt={item.title || "Trabajo"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('🚨 Gallery image failed to load:', item.imageUrl);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('✅ Gallery image loaded successfully:', item.imageUrl.substring(0, 50) + '...');
                            }}
                          />
                        </div>
                        {item.title && (
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white bg-gradient-to-t from-black/60 via-transparent to-transparent">
                            <p className="font-semibold text-lg">{item.title}</p>
                            {item.description && (
                              <p className="text-sm opacity-90 mt-1">{item.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location & Map Section */}
            {(settings?.streetAddress || business.address) && (
              <Card className={`${themeConfig.card} ${themeConfig.effects} group`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent group-hover:from-violet-600 group-hover:to-purple-600 transition-all duration-500 flex items-center">
                    <MapPin className="w-8 h-8 mr-4 text-purple-500" />
                    📍 Ubicación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                          <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                          Dirección
                        </h3>
                        <div className="space-y-2 text-gray-700">
                          {settings?.streetAddress ? (
                            <>
                              <p className="font-semibold text-lg">{settings.streetAddress}</p>
                              {settings.district && <p className="text-gray-600">{settings.district}</p>}
                              {settings.region && <p className="text-gray-600">{settings.region}</p>}
                              {settings.postalCode && <p className="text-gray-600">CP: {settings.postalCode}</p>}
                              {settings.country && <p className="text-gray-600">{settings.country}</p>}
                            </>
                          ) : (
                            <p className="text-lg">{business.address}</p>
                          )}
                        </div>

                        {/* Transportation Info */}
                        {settings?.transportationInfo && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                              🚇 Cómo llegar
                            </h4>
                            <p className="text-gray-600 text-sm">{settings.transportationInfo}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Map placeholder - can be enhanced with actual map integration */}
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center min-h-[300px] border border-gray-200">
                      <div className="text-center text-gray-500">
                        <MapPin className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-lg font-semibold">Mapa Interactivo</p>
                        <p className="text-sm mt-2">Próximamente: Mapa con ubicación exacta</p>
                        {(settings?.streetAddress || business.address) && (
                          <Button
                            className="mt-4 bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              const address = encodeURIComponent(settings?.streetAddress || business.address);
                              window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                            }}
                          >
                            Ver en Google Maps
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews - Enhanced */}
            {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
              <Card className={`${themeConfig.card} ${themeConfig.effects} group`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-red-600 transition-all duration-500 flex items-center justify-between">
                    <span className="flex items-center">
                      ⭐ Reseñas de Clientes
                    </span>
                    {reviews && reviews.length > 0 && (
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 border-yellow-200 px-4 py-2 text-lg font-bold">
                          {reviews.length} reseñas
                        </Badge>
                        {/* Average Rating */}
                        <div className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-xl border border-yellow-200">
                          <Star className="w-5 h-5 text-yellow-600 fill-yellow-600 mr-1" />
                          <span className="font-bold text-yellow-700">
                            {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-lg">Lo que dicen nuestros clientes sobre nosotros</p>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Existing Reviews */}
                  {reviews && reviews.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-gradient-to-r from-white/90 to-gray-50/70 rounded-xl p-6 border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                                {review.clientName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{review.clientName}</p>
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-100/70 px-3 py-1 rounded-full">
                              {review.source === 'scraped' ? '🌐 Google' : '💬 Directo'}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 italic leading-relaxed text-sm">"{review.comment}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review Submission Form */}
                  {settings?.enableReviews && (
                    <div className="border-t border-gray-200/50 pt-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Star className="w-6 h-6 mr-3 text-yellow-500" />
                        Deja tu reseña
                      </h3>
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="review-name" className="text-gray-700 font-semibold text-lg">Tu nombre</Label>
                            <Input
                              id="review-name"
                              placeholder="Tu nombre completo"
                              className="mt-2 border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors duration-300 text-lg p-3"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700 font-semibold text-lg mb-3 block">Calificación</Label>
                            <div className="flex space-x-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className="w-8 h-8 cursor-pointer text-gray-300 hover:text-yellow-400 transition-colors duration-200"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-6">
                          <Label htmlFor="review-comment" className="text-gray-700 font-semibold text-lg">Tu experiencia</Label>
                          <Textarea
                            id="review-comment"
                            placeholder="Cuéntanos sobre tu experiencia con este negocio..."
                            rows={4}
                            className="mt-2 border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500 transition-colors duration-300 text-lg"
                          />
                        </div>
                        <Button className="w-full mt-6 bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg py-4 text-lg font-bold">
                          ⭐ Enviar Reseña
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Form - Enhanced */}
            {settings?.enableContactForm && (
              <Card className={`${themeConfig.card} ${themeConfig.effects}`}>
                <CardHeader className="pb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center">
                    <MessageSquare className="w-8 h-8 mr-4 text-green-500" />
                    💬 Enviar Mensaje
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-lg">¿Tienes alguna pregunta? Escríbenos</p>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="contact-name" className="text-gray-700 font-semibold text-lg">Nombre</Label>
                        <Input
                          id="contact-name"
                          placeholder="Tu nombre completo"
                          className="mt-2 border-green-200 focus:border-green-500 focus:ring-green-500 transition-colors duration-300 text-lg p-3"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email" className="text-gray-700 font-semibold text-lg">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="tu@email.com"
                          className="mt-2 border-green-200 focus:border-green-500 focus:ring-green-500 transition-colors duration-300 text-lg p-3"
                        />
                      </div>
                    </div>
                    <div className="mt-6">
                      <Label htmlFor="contact-message" className="text-gray-700 font-semibold text-lg">Mensaje</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Escribe tu mensaje o consulta..."
                        rows={5}
                        className="mt-2 border-green-200 focus:border-green-500 focus:ring-green-500 transition-colors duration-300 text-lg"
                      />
                    </div>
                    <Button className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-4 text-lg font-bold">
                      📧 Enviar Mensaje
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Compact Sidebar - Takes 1 column */}
          <div className="space-y-6">
            <div className="sticky top-8 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Quick Contact - Compact */}
              <Card className={`${themeConfig.card} ${themeConfig.effects} group sticky top-4`}>
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-100">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent group-hover:from-cyan-600 group-hover:to-blue-600 transition-all duration-500">
                    📞 Contacto Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {(settings?.publicPhone || business.phone) && (
                    <a
                      href={`tel:${settings?.publicPhone || business.phone}`}
                      className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:shadow-md transition-all duration-300 group/contact border border-green-100"
                    >
                      <Phone className="w-5 h-5 mr-3 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-700">Llamar</div>
                        <div className="text-sm text-gray-600">{settings?.publicPhone || business.phone}</div>
                      </div>
                    </a>
                  )}

                  {(settings?.publicEmail || business.email) && (
                    <a
                      href={`mailto:${settings?.publicEmail || business.email}`}
                      className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg hover:shadow-md transition-all duration-300 group/contact border border-blue-100"
                    >
                      <Mail className="w-5 h-5 mr-3 text-blue-600" />
                      <div>
                        <div className="font-semibold text-blue-700">Email</div>
                        <div className="text-sm text-gray-600">{settings?.publicEmail || business.email}</div>
                      </div>
                    </a>
                  )}

                  {(settings?.streetAddress || business.address) && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 mr-3 text-purple-600 mt-1" />
                        <div>
                          <div className="font-semibold text-purple-700 mb-1">Dirección</div>
                          <div className="text-sm text-gray-600">
                            {settings?.streetAddress ? (
                              <>
                                <div>{settings.streetAddress}</div>
                                {settings.district && <div>{settings.district}</div>}
                              </>
                            ) : (
                              business.address
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {settings?.enablePublicBooking && (
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-cyan-600 hover:to-blue-600 text-white py-3 font-semibold">
                        <Calendar className="w-4 h-4 mr-2" />
                        Reservar Cita
                      </Button>
                    )}
                    {(settings?.streetAddress || business.address) && (
                      <Button
                        variant="outline"
                        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={() => {
                          const address = encodeURIComponent(settings?.streetAddress || business.address);
                          window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                        }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Ver Mapa
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Hours - Compact */}
              <Card className={`${themeConfig.card} ${themeConfig.effects} group`}>
                <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-gray-100">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent group-hover:from-yellow-600 group-hover:to-orange-600 transition-all duration-500 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-orange-500" />
                    🕐 Horarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Priority 1: Use scraped business hours if available */}
                  {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
                    <div className="space-y-2">
                      {Array.isArray(business.hours)
                        ? business.hours.slice(0, 7).map((hourString, index) => {
                          const parts = hourString.split(':');
                          if (parts.length < 2) return null;

                          const day = parts[0].trim();
                          const timeRange = parts.slice(1).join(':').trim();
                          const isOpen = !timeRange.toLowerCase().includes('closed') && !timeRange.toLowerCase().includes('cerrado');

                          // Get current day to highlight
                          const today = new Date().getDay();
                          const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day.toLowerCase());
                          const isToday = dayIndex === today;

                          return (
                            <div key={index} className={`flex justify-between items-center p-2 rounded-lg text-sm ${isToday ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200' :
                              isOpen ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gray-50'
                              }`}>
                              <span className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                {day.slice(0, 3)}:
                              </span>
                              <span className={`font-semibold ${isToday ? 'text-blue-700' :
                                isOpen ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                {isOpen ? timeRange : 'Cerrado'}
                              </span>
                            </div>
                          );
                        })
                        : Object.entries(business.hours).map(([dayKey, schedule]: [string, any]) => {
                          const isOpen = schedule && !schedule.closed && schedule.open && schedule.close;

                          return (
                            <div key={dayKey} className={`flex justify-between items-center p-2 rounded-lg text-sm ${isOpen ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gray-50'
                              }`}>
                              <span className="font-medium text-gray-700 capitalize">
                                {dayKey.slice(0, 3)}:
                              </span>
                              <span className={`font-semibold ${isOpen ? 'text-green-700' : 'text-gray-500'}`}>
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
                      <div className="space-y-2">
                        {[
                          { dayIndex: '1', label: 'Lun' },
                          { dayIndex: '2', label: 'Mar' },
                          { dayIndex: '3', label: 'Mié' },
                          { dayIndex: '4', label: 'Jue' },
                          { dayIndex: '5', label: 'Vie' },
                          { dayIndex: '6', label: 'Sáb' },
                          { dayIndex: '0', label: 'Dom' }
                        ].map(({ dayIndex, label }) => {
                          const hours = settings.workingHours[dayIndex];
                          if (!hours) return null;

                          const today = new Date().getDay().toString();
                          const isToday = dayIndex === today;

                          return (
                            <div key={dayIndex} className={`flex justify-between items-center p-2 rounded-lg text-sm ${isToday ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200' :
                              hours.enabled ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gray-50'
                              }`}>
                              <span className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                {label}:
                              </span>
                              <span className={`font-semibold ${isToday ? 'text-blue-700' :
                                hours.enabled ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">⏰ Horarios no disponibles</p>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Social Media - Compact */}
              {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
                <Card className={`${themeConfig.card} ${themeConfig.effects} group`}>
                  <CardHeader className="pb-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-pink-600 group-hover:to-purple-600 transition-all duration-500">
                      🌐 Síguenos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {settings?.facebookUrl && (
                        <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl transition-all duration-300">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          <span className="text-sm font-semibold">Facebook</span>
                        </a>
                      )}
                      {settings?.instagramUrl && (
                        <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center p-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl transition-all duration-300">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001z" />
                          </svg>
                          <span className="text-sm font-semibold">Instagram</span>
                        </a>
                      )}
                      {settings?.tiktokUrl && (
                        <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center p-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl transition-all duration-300">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                          </svg>
                          <span className="text-sm font-semibold">TikTok</span>
                        </a>
                      )}
                      {settings?.youtubeUrl && (
                        <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center p-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <span className="text-sm font-semibold">YouTube</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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