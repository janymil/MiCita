import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Calendar, Palette, Clock, Mail, MapPin } from "lucide-react";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { getThemeClasses } from "@/lib/microsite-themes";

interface BrutalistThemeProps {
  business: any;
  settings: any;
  services: any[];
  gallery: any[];
  reviews: any[];
  isThemeSelectorOpen: boolean;
  setIsThemeSelectorOpen: (open: boolean) => void;
}

export default function BrutalistTheme({
  business,
  settings,
  services,
  gallery,
  reviews,
  isThemeSelectorOpen,
  setIsThemeSelectorOpen
}: BrutalistThemeProps) {
  const themeConfig = getThemeClasses('brutalist');
  const categoryInfo = categories.find((c: any) => c.id === business.category);

  return (
    <div className={`min-h-screen ${themeConfig.background} ${themeConfig.special} relative`}>
      {/* Brutalist animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500 transform rotate-45 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-400 transform -rotate-12 animate-bounce"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-20 bg-cyan-400 transform skew-x-12 animate-pulse"></div>
      </div>

      {/* Brutalist Header */}
      <header className={`${themeConfig.header} sticky top-0 z-50 relative`}>
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-20 h-20 object-cover border-8 border-black shadow-[8px_8px_0px_0px_#ff0000]"
                />
              ) : (
                <div className="w-20 h-20 bg-white border-8 border-black flex items-center justify-center shadow-[8px_8px_0px_0px_#ff0000]">
                  <span className="text-4xl font-black text-black">{business.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <h1 className="text-4xl font-black text-black uppercase tracking-wider transform -skew-x-6">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-xl font-black text-black mt-2 uppercase">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge className={`mt-3 ${themeConfig.accent} px-4 py-2 text-lg font-black uppercase`}>
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button className={`${themeConfig.button} px-8 py-4 text-xl font-black uppercase`} onClick={() => setIsThemeSelectorOpen(true)}>
                <Palette className="w-6 h-6 mr-3" />
                TEMAS
              </Button>
              {settings?.publicPhone && (
                <Button className={`${themeConfig.button} px-8 py-4 text-xl font-black uppercase`}>
                  <Phone className="w-6 h-6 mr-3" />
                  LLAMAR
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Brutalist Masonry Layout */}
      <div className="container mx-auto px-8 py-12">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {/* About Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
            <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">SOBRE NOSOTROS</h2>
            <p className="text-lg font-bold text-black leading-relaxed">
              {settings?.publicDescription || business.description || "INFORMACIÓN NO DISPONIBLE."}
            </p>
          </div>

          {/* Services Card */}
          {services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
              <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">SERVICIOS</h2>
              <div className="space-y-6">
                {services.map((service: any) => (
                  <div key={service.id} className="bg-cyan-400 border-4 border-black p-4 shadow-[4px_4px_0px_0px_#ff00ff]">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-black text-black uppercase">{service.name}</h3>
                      <span className="text-2xl font-black text-black bg-yellow-400 px-3 py-1 border-2 border-black">
                        S/ {service.price}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-base font-bold text-black mt-2">{service.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Working Hours Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
            <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">HORARIOS</h2>
            <div className="space-y-4">
              {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
                <div className="space-y-3">
                  {Array.isArray(business.hours) 
                    ? business.hours.map((hourString: string, index: number) => {
                        const parts = hourString.split(':');
                        if (parts.length < 2) return null;
                        
                        const day = parts[0].trim();
                        const timeRange = parts.slice(1).join(':').trim();
                        const isOpen = !timeRange.toLowerCase().includes('closed') && !timeRange.toLowerCase().includes('cerrado');
                        
                        return (
                          <div key={index} className={`${isOpen ? 'bg-green-400' : 'bg-gray-400'} border-4 border-black p-4`}>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-black text-black uppercase">{day}</span>
                              <span className="text-lg font-black text-black uppercase">{isOpen ? timeRange : 'CERRADO'}</span>
                            </div>
                          </div>
                        );
                      })
                    : Object.entries(business.hours).map(([day, schedule]: [string, any]) => {
                        const isOpen = schedule?.isOpen !== false;
                        return (
                          <div key={day} className={`${isOpen ? 'bg-green-400' : 'bg-gray-400'} border-4 border-black p-4`}>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-black text-black uppercase">{day}</span>
                              <span className="text-lg font-black text-black uppercase">
                                {isOpen ? `${schedule.open} - ${schedule.close}` : 'CERRADO'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              ) : 
              settings?.workingHours ? (
                <div className="space-y-3">
                  {[
                    { key: '1', label: 'LUNES' },
                    { key: '2', label: 'MARTES' },
                    { key: '3', label: 'MIÉRCOLES' },
                    { key: '4', label: 'JUEVES' },
                    { key: '5', label: 'VIERNES' },
                    { key: '6', label: 'SÁBADO' },
                    { key: '0', label: 'DOMINGO' }
                  ].map(({ key, label }) => {
                    const hours = settings.workingHours[key];
                    if (!hours) return null;
                    
                    return (
                      <div key={key} className={`${hours.enabled ? 'bg-green-400' : 'bg-gray-400'} border-4 border-black p-4`}>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-black text-black uppercase">{label}</span>
                          <span className="text-lg font-black text-black uppercase">
                            {hours.enabled ? `${hours.start} - ${hours.end}` : 'CERRADO'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-red-400 border-4 border-black p-6 text-center">
                  <p className="text-xl font-black text-black uppercase">HORARIOS NO DISPONIBLES</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Card */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
            <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">CONTACTO</h2>
            <div className="space-y-4">
              {(settings?.publicPhone || business.phone) && (
                <div className="bg-green-400 border-4 border-black p-4">
                  <span className="text-xl font-black text-black uppercase">{settings?.publicPhone || business.phone}</span>
                </div>
              )}
              {(settings?.publicEmail || business.email) && (
                <div className="bg-blue-400 border-4 border-black p-4">
                  <span className="text-xl font-black text-black uppercase">{settings?.publicEmail || business.email}</span>
                </div>
              )}
              {(settings?.streetAddress || business.address) && (
                <div className="bg-purple-400 border-4 border-black p-4">
                  <span className="text-xl font-black text-black uppercase">{settings?.streetAddress || business.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Card */}
          {settings?.enableGallery && gallery && gallery.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
              <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">GALERÍA</h2>
              <div className="grid grid-cols-2 gap-4">
                {gallery.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="border-4 border-black">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title || "Trabajo"}
                      className="w-full h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Card */}
          {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
              <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">RESEÑAS</h2>
              <div className="space-y-4">
                {reviews && reviews.length > 0 && reviews.slice(0, 3).map((review: any) => (
                  <div key={review.id} className="bg-yellow-400 border-4 border-black p-4">
                    <div className="flex mb-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-2xl ${i < review.rating ? '★' : '☆'}`}>
                          {i < review.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <p className="text-lg font-black text-black uppercase">{review.clientName}</p>
                    {review.comment && (
                      <p className="text-base font-bold text-black mt-2">"{review.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Widget */}
          {settings?.enablePublicBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
              <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">RESERVAR</h2>
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
    </div>
  );
}