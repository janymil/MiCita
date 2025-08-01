import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Calendar, Palette, Clock, Mail, MapPin, Grid3X3 } from "lucide-react";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { getThemeClasses } from "@/lib/microsite-themes";

interface BentoThemeProps {
  business: any;
  settings: any;
  services: any[];
  gallery: any[];
  reviews: any[];
  isThemeSelectorOpen: boolean;
  setIsThemeSelectorOpen: (open: boolean) => void;
}

export default function BentoTheme({
  business,
  settings,
  services,
  gallery,
  reviews,
  isThemeSelectorOpen,
  setIsThemeSelectorOpen
}: BentoThemeProps) {
  const themeConfig = getThemeClasses('bento');
  const categoryInfo = categories.find((c: any) => c.id === business.category);

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      {/* Bento Header */}
      <header className={`${themeConfig.header} sticky top-0 z-50`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-lg">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-stone-800">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-stone-600">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge className={`mt-1 ${themeConfig.accent}`}>
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button className={`${themeConfig.button}`} onClick={() => setIsThemeSelectorOpen(true)}>
                <Grid3X3 className="w-4 h-4 mr-2" />
                Temas
              </Button>
              {settings?.publicPhone && (
                <Button className={`${themeConfig.button}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Large About Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-2 lg:col-span-2`}>
            <div className="p-8">
              <h2 className="text-xl font-semibold text-stone-800 mb-4">Sobre nosotros</h2>
              <p className="text-stone-700 leading-relaxed">
                {settings?.publicDescription || business.description || "Información no disponible."}
              </p>
            </div>
          </div>

          {/* Contact Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects}`}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Contacto</h3>
              <div className="space-y-3">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 text-orange-500" />
                    <span className="text-sm text-stone-700">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}
                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-orange-500" />
                    <span className="text-sm text-stone-700">{settings?.publicEmail || business.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Horarios Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects}`}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Horarios</h3>
              {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
                <div className="space-y-2">
                  {Array.isArray(business.hours) 
                    ? business.hours.slice(0, 3).map((hourString: string, index: number) => {
                        const parts = hourString.split(':');
                        if (parts.length < 2) return null;
                        const day = parts[0].trim();
                        const timeRange = parts.slice(1).join(':').trim();
                        const isOpen = !timeRange.toLowerCase().includes('closed') && !timeRange.toLowerCase().includes('cerrado');
                        
                        return (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-stone-600 capitalize">{day}:</span>
                            <span className={isOpen ? "text-green-600" : "text-red-600"}>
                              {isOpen ? timeRange : "Cerrado"}
                            </span>
                          </div>
                        );
                      })
                    : Object.entries(business.hours).slice(0, 3).map(([day, schedule]: [string, any]) => (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="text-stone-600 capitalize">{day}:</span>
                          <span className={schedule?.open ? "text-green-600" : "text-red-600"}>
                            {schedule?.open ? `${schedule.open}-${schedule.close}` : "Cerrado"}
                          </span>
                        </div>
                      ))
                  }
                </div>
              ) : settings?.workingHours ? (
                <div className="space-y-2">
                  {[
                    { key: '1', label: 'Lunes' },
                    { key: '2', label: 'Martes' },
                    { key: '3', label: 'Miércoles' }
                  ].map(({ key, label }) => {
                    const hours = settings.workingHours[key];
                    if (!hours) return null;
                    
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-stone-600">{label}:</span>
                        <span className={hours.enabled ? "text-green-600" : "text-red-600"}>
                          {hours.enabled ? `${hours.start} - ${hours.end}` : "Cerrado"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-stone-600 text-sm">No disponible</p>
              )}
            </div>
          </div>

          {/* Services Cards */}
          {services && services.length > 0 && (
            <>
              <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-3 lg:col-span-4`}>
                <div className="p-8">
                  <h2 className="text-xl font-semibold text-stone-800 mb-6">Nuestros Servicios</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((service: any) => (
                      <div key={service.id} className={`${themeConfig.accent} p-6 rounded-2xl`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-stone-800">{service.name}</h3>
                          <span className="font-semibold text-orange-600">S/ {service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-sm text-stone-600 mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center text-xs text-stone-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {service.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Gallery Card */}
          {settings?.enableGallery && gallery && gallery.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-2`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Galería</h3>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="rounded-xl overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title || "Trabajo"}
                        className="w-full h-24 object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews Card */}
          {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-1`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Reseñas</h3>
                <div className="space-y-3">
                  {reviews && reviews.length > 0 && reviews.slice(0, 2).map((review: any) => (
                    <div key={review.id} className={`${themeConfig.accent} p-4 rounded-xl`}>
                      <div className="flex items-center mb-2">
                        <div className="flex mr-2">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-stone-700">{review.clientName}</span>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-stone-600">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Booking Widget */}
          {settings?.enablePublicBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-3`}>
              <div className="p-8">
                <h2 className="text-xl font-semibold text-stone-800 mb-6">Reservar Cita</h2>
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

          {/* Contact Form */}
          {settings?.enableContactForm && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-1`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Enviar Mensaje</h3>
                <div className="space-y-4">
                  <Input placeholder="Nombre" className="rounded-xl" />
                  <Input placeholder="Email" className="rounded-xl" />
                  <Textarea placeholder="Mensaje" rows={3} className="rounded-xl" />
                  <Button className={`w-full ${themeConfig.button} rounded-xl`}>
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}