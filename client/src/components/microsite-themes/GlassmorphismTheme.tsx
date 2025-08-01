import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Calendar, Palette, Clock, Mail, MapPin, MessageSquare } from "lucide-react";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { getThemeClasses } from "@/lib/microsite-themes";

interface GlassmorphismThemeProps {
  business: any;
  settings: any;
  services: any[];
  gallery: any[];
  reviews: any[];
  isThemeSelectorOpen: boolean;
  setIsThemeSelectorOpen: (open: boolean) => void;
}

export default function GlassmorphismTheme({
  business,
  settings,
  services,
  gallery,
  reviews,
  isThemeSelectorOpen,
  setIsThemeSelectorOpen
}: GlassmorphismThemeProps) {
  const themeConfig = getThemeClasses('glassmorphism');
  const categoryInfo = categories.find((c: any) => c.id === business.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-gray-600">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge className="mt-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" 
                onClick={() => setIsThemeSelectorOpen(true)}
              >
                <Palette className="w-4 h-4 mr-2" />
                Temas
              </Button>
              {(settings?.publicPhone || business.phone) && (
                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              )}
              {settings?.enablePublicBooking && (
                <Button className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white">
                  <Calendar className="w-4 h-4 mr-2" />
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
          {settings?.professionalTitle && (
            <div className="absolute bottom-6 left-6 text-white">
              <h2 className="text-3xl font-bold mb-2">{settings.professionalTitle}</h2>
              <p className="text-lg opacity-90">
                {settings?.publicDescription?.substring(0, 100) || business.description?.substring(0, 100)}...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  🏢 Sobre nosotros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {settings?.publicDescription || business.description || "Información no disponible."}
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                    ⚡ Nuestros Servicios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {services.map((service: any) => (
                      <div 
                        key={service.id} 
                        className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200/50 hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{service.name}</h3>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            )}
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {service.duration} minutos
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-green-600">S/ {service.price}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    📸 Galería
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item: any) => (
                      <div key={item.id} className="relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || "Trabajo"}
                          className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-2 left-2 text-white text-xs font-medium">
                            {item.title || "Trabajo"}
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <label className="text-gray-700 font-medium">Nombre</label>
                    <Input 
                      placeholder="Tu nombre" 
                      className="mt-1 bg-white/50 border-gray-300/50 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium">Email</label>
                    <Input 
                      type="email" 
                      placeholder="tu@email.com" 
                      className="mt-1 bg-white/50 border-gray-300/50 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium">Mensaje</label>
                    <Textarea 
                      placeholder="Escribe tu mensaje aquí..." 
                      rows={4}
                      className="mt-1 bg-white/50 border-gray-300/50 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    Enviar Mensaje
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-green-500" />
                  📞 Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:shadow-md transition-shadow">
                    <Phone className="w-4 h-4 mr-3 text-green-600" />
                    <span className="text-gray-800 font-medium">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}
                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg hover:shadow-md transition-shadow">
                    <Mail className="w-4 h-4 mr-3 text-blue-600" />
                    <span className="text-gray-800 font-medium">{settings?.publicEmail || business.email}</span>
                  </div>
                )}
                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow">
                    <MapPin className="w-4 h-4 mr-3 text-purple-600 mt-0.5" />
                    <span className="text-gray-800 text-sm">{settings?.streetAddress || business.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  🕐 Horarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Priority 1: Use scraped business hours if available */}
                {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
                  <div className="space-y-3">
                    {/* Handle both array format (legacy) and object format (new) */}
                    {Array.isArray(business.hours) 
                      ? business.hours.map((hourString: string, index: number) => {
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
                      : Object.entries(business.hours).map(([day, schedule]: [string, any]) => {
                          const isOpen = schedule?.isOpen !== false;
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
                            <div key={day} className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
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
                      { key: '1', label: 'Lunes', emoji: '📅' },
                      { key: '2', label: 'Martes', emoji: '📅' },
                      { key: '3', label: 'Miércoles', emoji: '📅' },
                      { key: '4', label: 'Jueves', emoji: '📅' },
                      { key: '5', label: 'Viernes', emoji: '📅' },
                      { key: '6', label: 'Sábado', emoji: '🎯' },
                      { key: '0', label: 'Domingo', emoji: '🌞' }
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

            {/* Reviews */}
            {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
              <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    ⭐ Reseñas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews && reviews.length > 0 && reviews.slice(0, 3).map((review: any) => (
                      <div key={review.id} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200/50 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center mb-2">
                          <div className="flex mr-3">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-lg ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="font-medium text-gray-800">{review.clientName}</span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}