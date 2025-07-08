import React from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Coffee, Heart, Wifi, Music } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function CafeteriaTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      {/* Cozy Coffee Hero */}
      <section className="relative h-screen bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-600 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Cafetería"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-900/80 via-orange-900/70 to-yellow-900/80"></div>
          </div>
        )}

        {/* Coffee Steam Animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white/10 rounded-full animate-bounce"
              style={{
                left: `${20 + i * 15}%`,
                bottom: '60%',
                width: `${8 + Math.random() * 4}px`,
                height: `${20 + Math.random() * 10}px`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + Math.random()}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl text-white">
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-24 h-24 rounded-full border-4 border-amber-300 shadow-lg object-cover"
                />
              </div>
            )}

            <Badge className="bg-amber-500/20 text-amber-200 border-amber-300/50 mb-4 text-lg px-4 py-2">
              <Coffee className="w-5 h-5 mr-2" />
              CAFÉ DE ESPECIALIDAD
            </Badge>
            
            <h1 className="text-6xl font-black mb-4 leading-tight">
              {business.name}
            </h1>
            
            {settings?.professionalTitle && (
              <p className="text-2xl text-amber-200 mb-6 font-light">
                {settings.professionalTitle}
              </p>
            )}

            <p className="text-xl text-amber-100 mb-8 leading-relaxed">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-50 font-bold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Reservar Mesa
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold px-8">
                <Coffee className="w-5 h-5 mr-2" />
                Ver Menú
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Atmosphere Features */}
      <section className="py-16 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Coffee className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Café Premium</h3>
              <p className="text-gray-600">Granos seleccionados de origen</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Wifi className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">WiFi Gratis</h3>
              <p className="text-gray-600">Perfecto para trabajar</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Music className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ambiente Relajado</h3>
              <p className="text-gray-600">Música suave y ambiente acogedor</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Hecho con Amor</h3>
              <p className="text-gray-600">Cada taza preparada con cariño</p>
            </div>
          </div>
        </div>
      </section>

      {/* Menu */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Nuestra Carta
              </h2>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                Deléitate con nuestras bebidas artesanales y postres caseros
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <div className="relative">
                    <div className="h-32 bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center">
                      <Coffee className="w-12 h-12 text-white opacity-70" />
                    </div>
                    <Badge className="absolute top-4 right-4 bg-amber-600 text-white border-0">
                      S/ {service.price}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-amber-600 transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-gray-600 mb-4">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration} min
                      </div>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                        Pedir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                ¡Ven por tu Café!
              </h2>
              <p className="text-amber-100 text-xl mb-8">
                Tu lugar favorito para disfrutar un buen café y relajarte
              </p>

              <div className="space-y-6">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-6 h-6 mr-4" />
                    <span className="text-xl">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 mt-1" />
                    <div className="text-xl">
                      {settings?.streetAddress ? (
                        <>
                          <p>{settings.streetAddress}</p>
                          {settings.district && <p className="text-amber-200">{settings.district}</p>}
                        </>
                      ) : (
                        <p>{business.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {settings?.enableContactForm && (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Contáctanos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-amber-200">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-amber-200" 
                           placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label className="text-amber-200">Mensaje</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-amber-200" 
                              placeholder="¿Tienes alguna pregunta?" 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-white text-amber-600 hover:bg-amber-50">
                    <Coffee className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {settings?.enablePublicBooking && (
        <BookingWidget businessId={business.id} />
      )}
    </div>
  );
}