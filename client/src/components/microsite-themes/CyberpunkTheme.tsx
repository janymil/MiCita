import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Calendar, Palette, Clock, Mail, MapPin } from "lucide-react";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { getThemeClasses } from "@/lib/microsite-themes";

interface CyberpunkThemeProps {
  business: any;
  settings: any;
  services: any[];
  gallery: any[];
  reviews: any[];
  isThemeSelectorOpen: boolean;
  setIsThemeSelectorOpen: (open: boolean) => void;
}

export default function CyberpunkTheme({
  business,
  settings,
  services,
  gallery,
  reviews,
  isThemeSelectorOpen,
  setIsThemeSelectorOpen
}: CyberpunkThemeProps) {
  const themeConfig = getThemeClasses('cyberpunk');
  const categoryInfo = categories.find((c: any) => c.id === business.category);

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      {/* Cyberpunk animated grid background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="grid grid-cols-20 grid-rows-20 w-full h-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div
              key={i}
              className="border border-cyan-400/20 animate-pulse"
              style={{ animationDelay: `${Math.random() * 2}s` }}
            />
          ))}
        </div>
      </div>

      {/* Cyberpunk Header */}
      <header className={`${themeConfig.header} sticky top-0 z-50 relative`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-16 h-16 object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-400/50"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-pink-400 flex items-center justify-center font-mono font-bold text-black text-lg border-2 border-cyan-400 shadow-lg shadow-cyan-400/50">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent uppercase tracking-wider">
                  {business.name}
                </h1>
                {settings?.professionalTitle && (
                  <p className="text-pink-400 font-mono tracking-wide">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge className={`mt-1 ${themeConfig.accent} font-mono`}>
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button className={`${themeConfig.button} px-6 py-3`} onClick={() => setIsThemeSelectorOpen(true)}>
                <Palette className="w-5 h-5 mr-2" />
                THEMAS
              </Button>
              {settings?.publicPhone && (
                <Button className={`${themeConfig.button} px-6 py-3`}>
                  <Phone className="w-5 h-5 mr-2" />
                  CONNECT
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cyberpunk Sidebar Layout */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 p-6 space-y-6">
          {/* Contact Panel */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-6`}>
            <h3 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-widest mb-4">// CONNECT</h3>
            <div className="space-y-3">
              {(settings?.publicPhone || business.phone) && (
                <div className="flex items-center p-3 bg-cyan-400/10 border border-cyan-400/30 rounded">
                  <Phone className="w-4 h-4 mr-3 text-cyan-400" />
                  <span className="font-mono text-sm">{settings?.publicPhone || business.phone}</span>
                </div>
              )}
              {(settings?.publicEmail || business.email) && (
                <div className="flex items-center p-3 bg-pink-400/10 border border-pink-400/30 rounded">
                  <Mail className="w-4 h-4 mr-3 text-pink-400" />
                  <span className="font-mono text-sm">{settings?.publicEmail || business.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hours Panel */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-6`}>
            <h3 className="text-lg font-mono font-bold text-cyan-400 uppercase tracking-widest mb-4">// RUNTIME</h3>
            {business.hours && (Array.isArray(business.hours) ? business.hours.length > 0 : Object.keys(business.hours).length > 0) ? (
              <div className="space-y-2">
                {Array.isArray(business.hours) 
                  ? business.hours.map((hourString: string, index: number) => {
                      const parts = hourString.split(':');
                      if (parts.length < 2) return null;
                      const day = parts[0].trim();
                      const timeRange = parts.slice(1).join(':').trim();
                      const isOpen = !timeRange.toLowerCase().includes('closed') && !timeRange.toLowerCase().includes('cerrado');
                      
                      return (
                        <div key={index} className="flex justify-between font-mono text-sm">
                          <span className="text-cyan-200">{day}:</span>
                          <span className={isOpen ? "text-green-400" : "text-red-400"}>
                            {isOpen ? timeRange : "OFFLINE"}
                          </span>
                        </div>
                      );
                    })
                  : Object.entries(business.hours).map(([day, schedule]: [string, any]) => (
                      <div key={day} className="flex justify-between font-mono text-sm">
                        <span className="text-cyan-200">{day}:</span>
                        <span className={schedule?.open ? "text-green-400" : "text-red-400"}>
                          {schedule?.open ? `${schedule.open}-${schedule.close}` : "OFFLINE"}
                        </span>
                      </div>
                    ))
                }
              </div>
            ) : settings?.workingHours ? (
              <div className="space-y-2">
                {[
                  { key: '1', label: 'MON' },
                  { key: '2', label: 'TUE' },
                  { key: '3', label: 'WED' },
                  { key: '4', label: 'THU' },
                  { key: '5', label: 'FRI' },
                  { key: '6', label: 'SAT' },
                  { key: '0', label: 'SUN' }
                ].map(({ key, label }) => {
                  const hours = settings.workingHours[key];
                  if (!hours) return null;
                  
                  return (
                    <div key={key} className="flex justify-between font-mono text-sm">
                      <span className="text-cyan-200">{label}:</span>
                      <span className={hours.enabled ? "text-green-400" : "text-red-400"}>
                        {hours.enabled ? `${hours.start}-${hours.end}` : "OFFLINE"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-red-400">// NO DATA</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* About */}
          <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
            <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// ABOUT.EXE</h2>
            <p className="font-mono text-cyan-100 leading-relaxed">
              {settings?.publicDescription || business.description || "// NO DESCRIPTION LOADED"}
            </p>
          </div>

          {/* Services */}
          {services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// SERVICES.JSON</h2>
              <div className="grid gap-4">
                {services.map((service: any) => (
                  <div key={service.id} className="border border-cyan-400/30 p-4 bg-cyan-400/5 hover:bg-cyan-400/10 transition-all">
                    <div className="flex justify-between items-start">
                      <h3 className="font-mono font-bold text-pink-400">{service.name}</h3>
                      <span className="font-mono text-cyan-400">S/ {service.price}</span>
                    </div>
                    {service.description && (
                      <p className="font-mono text-sm text-cyan-200 mt-2">{service.description}</p>
                    )}
                    <div className="flex items-center mt-2 font-mono text-xs text-green-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {service.duration} min
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {settings?.enableGallery && gallery && gallery.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// GALLERY.IMG</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {gallery.map((item: any) => (
                  <div key={item.id} className="relative border border-cyan-400/30 overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title || "Work"}
                      className="w-full h-32 object-cover hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/20 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 font-mono text-xs text-cyan-100">
                        {item.title || "image.jpg"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// REVIEWS.LOG</h2>
              <div className="space-y-4">
                {reviews && reviews.length > 0 && reviews.map((review: any) => (
                  <div key={review.id} className="border border-pink-400/30 p-4 bg-pink-400/5">
                    <div className="flex items-center mb-2">
                      <div className="flex mr-3">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`font-mono ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                            {i < review.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="font-mono text-pink-400">{review.clientName}</span>
                      <span className="ml-auto font-mono text-xs text-cyan-200">
                        {review.source === 'scraped' ? '// SCRAPED' : '// LOCAL'}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="font-mono text-sm text-cyan-100 mt-2">"{review.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Widget */}
          {settings?.enablePublicBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// BOOKING.SYS</h2>
              <BookingWidget 
                services={services}
                businessId={business.id}
                workingHours={settings?.workingHours}
                blockedDates={settings?.blockedDates}
                blockedHours={settings?.blockedHours}
              />
            </div>
          )}

          {/* Contact Form */}
          {settings?.enableContactForm && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// CONTACT.FORM</h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-cyan-400 mb-2">// NAME</label>
                  <Input className="bg-gray-800 border-cyan-400/50 text-cyan-100 font-mono" placeholder="your_name" />
                </div>
                <div>
                  <label className="block font-mono text-cyan-400 mb-2">// EMAIL</label>
                  <Input className="bg-gray-800 border-cyan-400/50 text-cyan-100 font-mono" placeholder="user@domain.com" />
                </div>
                <div>
                  <label className="block font-mono text-cyan-400 mb-2">// MESSAGE</label>
                  <Textarea className="bg-gray-800 border-cyan-400/50 text-cyan-100 font-mono" rows={4} placeholder="enter_message_here..." />
                </div>
                <Button className={`w-full ${themeConfig.button} font-mono`}>
                  &gt;&gt; SEND_MESSAGE
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}