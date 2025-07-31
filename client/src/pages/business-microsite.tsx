import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare, Palette, Grid3X3, Sidebar, Layout } from "lucide-react";
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
import { getThemeClasses } from "@/lib/microsite-themes";
import { MicrositeThemeSelector } from "@/components/microsite-theme-selector";
import { useState } from "react";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useMicrositeTheme();
  const themeConfig = getThemeClasses(theme);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return <MicrositeSkeletonLoader />;
  }

  if (error || !micrositeData) {
    if (slug && (slug.startsWith('dashboard') || slug === 'login' || slug === 'registro' || slug === 'business' || slug === 'buscar')) {
      return null;
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
  const categoryInfo = categories.find((c: any) => c.id === business.category);

  // Render different layouts based on theme
  const renderBrutalistLayout = () => (
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
            <div className="flex flex-col space-y-4">
              <Button className={`${themeConfig.button} px-8 py-4`} onClick={() => setIsThemeSelectorOpen(true)}>
                <Palette className="w-6 h-6 mr-3" />
                CAMBIAR TEMA
              </Button>
              {settings?.publicPhone && (
                <Button className={`${themeConfig.button} px-8 py-4`}>
                  <Phone className="w-6 h-6 mr-3" />
                  LLAMAR AHORA
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Brutalist Masonry Content */}
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
          {settings?.enableBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8 break-inside-avoid mb-8`}>
              <h2 className="text-3xl font-black text-black uppercase mb-6 transform -skew-x-3">RESERVAR</h2>
              <BookingWidget 
                services={services}
                businessId={business.id}
                workingHours={business.hours}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCyberpunkLayout = () => (
    <div className={`min-h-screen ${themeConfig.background} ${themeConfig.special} text-cyan-100`}>
      {/* Cyberpunk Header */}
      <header className={`${themeConfig.header} sticky top-0 z-50 ${themeConfig.effects}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <div className="relative">
                  <img 
                    src={settings.profileImage} 
                    alt={business.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.7)]"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/30 to-pink-400/30 animate-pulse"></div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center text-black font-mono font-bold text-xl shadow-[0_0_20px_rgba(6,182,212,0.7)]">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-mono font-bold text-cyan-100 uppercase tracking-widest glitch" data-text={business.name}>
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
            {business.hours && Object.keys(business.hours).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(business.hours).map(([day, schedule]: [string, any]) => (
                  <div key={day} className="flex justify-between font-mono text-sm">
                    <span className="text-cyan-200">{day}:</span>
                    <span className={schedule?.open ? "text-green-400" : "text-red-400"}>
                      {schedule?.open ? `${schedule.open}-${schedule.close}` : "OFFLINE"}
                    </span>
                  </div>
                ))}
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
          {settings?.enableBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">// BOOKING.SYS</h2>
              <BookingWidget 
                services={services}
                businessId={business.id}
                workingHours={business.hours}
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

  const renderBentoLayout = () => (
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
              {business.hours && Object.keys(business.hours).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(business.hours).slice(0, 3).map(([day, schedule]: [string, any]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-stone-600 capitalize">{day}:</span>
                      <span className={schedule?.open ? "text-green-600" : "text-red-600"}>
                        {schedule?.open ? `${schedule.open}-${schedule.close}` : "Cerrado"}
                      </span>
                    </div>
                  ))}
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
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-stone-800">{service.name}</h3>
                          <span className="text-orange-600 font-semibold">S/ {service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-stone-600 text-sm">{service.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Gallery */}
          {settings?.enableGallery && gallery && gallery.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-2`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Galería</h3>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.slice(0, 4).map((item: any) => (
                    <img 
                      key={item.id}
                      src={item.imageUrl} 
                      alt={item.title || "Trabajo"}
                      className="w-full h-24 object-cover rounded-xl"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          {(settings?.enableReviews || (reviews && reviews.length > 0)) && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-2`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Reseñas</h3>
                <div className="space-y-3">
                  {reviews && reviews.length > 0 && reviews.slice(0, 3).map((review: any) => (
                    <div key={review.id} className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl">
                      <div className="flex items-center mb-2">
                        <div className="flex mr-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="font-medium text-stone-800 text-sm">{review.clientName}</span>
                      </div>
                      {review.comment && (
                        <p className="text-stone-600 text-sm">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Booking Widget */}
          {settings?.enableBooking && services && services.length > 0 && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-3`}>
              <div className="p-8">
                <h2 className="text-xl font-semibold text-stone-800 mb-6">Reservar Cita</h2>
                <BookingWidget 
                  services={services}
                  businessId={business.id}
                  workingHours={business.hours}
                />
              </div>
            </div>
          )}

          {/* Contact Form */}
          {settings?.enableContactForm && (
            <div className={`${themeConfig.card} ${themeConfig.effects} md:col-span-2`}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-stone-800 mb-4">Contacto</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-stone-700 font-medium">Nombre</Label>
                    <Input placeholder="Tu nombre" className="mt-1 rounded-xl border-stone-200" />
                  </div>
                  <div>
                    <Label className="text-stone-700 font-medium">Email</Label>
                    <Input placeholder="tu@email.com" className="mt-1 rounded-xl border-stone-200" />
                  </div>
                  <div>
                    <Label className="text-stone-700 font-medium">Mensaje</Label>
                    <Textarea placeholder="Tu mensaje..." rows={4} className="mt-1 rounded-xl border-stone-200" />
                  </div>
                  <Button className={`w-full ${themeConfig.button}`}>
                    Enviar Mensaje
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGlassmorphismLayout = () => (
    <div className={`min-h-screen ${themeConfig.background}`}>
      {/* Floating Theme Selector */}
      <Button 
        className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-xl text-slate-800 border border-white/20 shadow-2xl hover:shadow-3xl"
        onClick={() => setIsThemeSelectorOpen(true)}
      >
        <Palette className="w-4 h-4 mr-2" />
        Cambiar Tema
      </Button>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {settings?.coverImage && (
          <img 
            src={settings.coverImage} 
            alt="Portada"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-purple-900/40"></div>
        
        <div className={`${themeConfig.special} p-12 rounded-3xl text-center relative z-10 max-w-2xl mx-4`}>
          {settings?.profileImage ? (
            <img 
              src={settings.profileImage} 
              alt={business.name}
              className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-white/30 shadow-2xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6 border-4 border-white/30 shadow-2xl">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <h1 className="text-5xl font-bold text-slate-800 mb-4">{business.name}</h1>
          
          {settings?.professionalTitle && (
            <p className="text-xl text-slate-600 mb-6">{settings.professionalTitle}</p>
          )}
          
          {categoryInfo && (
            <Badge className={`${themeConfig.accent} text-lg px-6 py-2 mb-8`}>
              {categoryInfo.name}
            </Badge>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {settings?.publicPhone && (
              <Button className={`${themeConfig.button} px-8 py-4 text-lg`}>
                <Phone className="w-5 h-5 mr-3" />
                Llamar Ahora
              </Button>
            )}
            {settings?.enablePublicBooking && (
              <Button className={`${themeConfig.button} px-8 py-4 text-lg`}>
                <Calendar className="w-5 h-5 mr-3" />
                Reservar Cita
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Sobre nosotros</h2>
              <p className="text-slate-700 leading-relaxed text-lg">
                {settings?.publicDescription || business.description || "Información no disponible."}
              </p>
            </div>

            {/* Services */}
            {services && services.length > 0 && (
              <div className={`${themeConfig.card} ${themeConfig.effects} p-8`}>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Nuestros Servicios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {services.map((service: any) => (
                    <div key={service.id} className={`${themeConfig.accent} p-6 rounded-2xl hover:scale-105 transition-transform duration-300`}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-slate-800">{service.name}</h3>
                        <span className="text-2xl font-bold text-indigo-600">S/ {service.price}</span>
                      </div>
                      {service.description && (
                        <p className="text-slate-600">{service.description}</p>
                      )}
                      <div className="flex items-center mt-4 text-slate-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {service.duration} min
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Contact */}
            <div className={`${themeConfig.card} ${themeConfig.effects} p-6`}>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Contacto</h3>
              <div className="space-y-4">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <Phone className="w-5 h-5 mr-3 text-green-600" />
                    <span className="text-slate-700">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}
                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <Mail className="w-5 h-5 mr-3 text-blue-600" />
                    <span className="text-slate-700">{settings?.publicEmail || business.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hours */}
            <div className={`${themeConfig.card} ${themeConfig.effects} p-6`}>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Horarios</h3>
              {business.hours && Object.keys(business.hours).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(business.hours).map(([day, schedule]: [string, any]) => (
                    <div key={day} className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
                      <span className="capitalize font-medium text-slate-800">{day}:</span>
                      <span className={`font-semibold ${schedule?.open ? 'text-green-600' : 'text-red-600'}`}>
                        {schedule?.open ? `${schedule.open} - ${schedule.close}` : 'Cerrado'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600">Horarios no disponibles</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Render based on theme layout */}
      {themeConfig.layout === 'masonry' && renderBrutalistLayout()}
      {themeConfig.layout === 'sidebar' && renderCyberpunkLayout()}
      {themeConfig.layout === 'bento' && renderBentoLayout()}
      {themeConfig.layout === 'traditional' && renderGlassmorphismLayout()}

      {/* Theme Selector Modal */}
      <MicrositeThemeSelector 
        isOpen={isThemeSelectorOpen} 
        onClose={() => setIsThemeSelectorOpen(false)} 
      />
    </>
  );
}
