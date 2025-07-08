import React from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Wrench, Car, Shield, Award, Settings, Gauge } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function AutomortrizTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Industrial Hero */}
      <section className="relative h-screen bg-gradient-to-br from-gray-800 via-blue-900 to-gray-900 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Taller automotriz"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-blue-900/80 to-gray-900/90"></div>
          </div>
        )}

        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 h-full">
            {[...Array(144)].map((_, i) => (
              <div 
                key={i} 
                className="border border-blue-400/20 animate-pulse"
                style={{ animationDelay: `${Math.random() * 3}s` }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl">
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-20 h-20 rounded-lg border-2 border-blue-400 shadow-lg object-cover"
                />
              </div>
            )}

            <div className="mb-6">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/50 mb-4 text-sm px-3 py-1">
                <Wrench className="w-4 h-4 mr-2" />
                SERVICIO PROFESIONAL AUTOMOTRIZ
              </Badge>
              <h1 className="text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  {business.name}
                </span>
              </h1>
              {settings?.professionalTitle && (
                <p className="text-xl text-blue-200 mb-4 font-light">
                  {settings.professionalTitle}
                </p>
              )}
            </div>

            <p className="text-lg text-gray-300 mb-8 leading-relaxed max-w-2xl">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Servicio
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-gray-900">
                <Phone className="w-5 h-5 mr-2" />
                Llamar Ahora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Servicios Especializados
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Mantenimiento y reparación profesional para tu vehículo con la mejor tecnología
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="bg-gray-900 border-gray-700 hover:border-blue-500 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-500 transition-colors">
                          <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {service.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} min
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">S/ {service.price}</div>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-400 mb-4">{service.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="border-blue-600 text-blue-400">
                        Servicio Garantizado
                      </Badge>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Reservar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Indicators */}
      <section className="py-16 bg-gray-900 border-y border-gray-700">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Garantía Total</h3>
              <p className="text-gray-400">En todos nuestros servicios</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Certificados</h3>
              <p className="text-gray-400">Técnicos especializados</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Gauge className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Diagnóstico</h3>
              <p className="text-gray-400">Tecnología avanzada</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Car className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Todas las Marcas</h3>
              <p className="text-gray-400">Servicio universal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workshop Gallery */}
      {settings?.enableGallery && gallery && gallery.length > 0 && (
        <section className="py-16 bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Nuestro Taller
              </h2>
              <p className="text-gray-400">
                Instalaciones modernas equipadas con la mejor tecnología
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item) => (
                <div key={item.id} className="relative group overflow-hidden rounded-lg">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title || "Taller"}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                      {item.title && (
                        <p className="text-white font-semibold">{item.title}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Customer Reviews */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Opiniones de Clientes
              </h2>
              <p className="text-gray-400">
                La confianza de nuestros clientes es nuestra mejor referencia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {review.clientName.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-white">{review.clientName}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-300 italic">"{review.comment}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-blue-700 via-blue-800 to-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                ¿Necesitas Reparación o Mantenimiento?
              </h2>
              <p className="text-blue-200 text-lg mb-8">
                Confía en nuestros expertos para mantener tu vehículo en perfectas condiciones.
              </p>

              <div className="space-y-6">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-200">Teléfono</p>
                      <p className="text-xl font-semibold text-white">{settings?.publicPhone || business.phone}</p>
                    </div>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-200">Taller</p>
                      {settings?.streetAddress ? (
                        <div className="text-lg text-white">
                          <p>{settings.streetAddress}</p>
                          {settings.district && <p className="text-blue-200">{settings.district}</p>}
                        </div>
                      ) : (
                        <p className="text-lg text-white">{business.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {settings?.enableContactForm && (
              <Card className="bg-white/10 border-white/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Solicitar Cotización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-blue-200">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label className="text-blue-200">Teléfono</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="Tu número" />
                  </div>
                  <div>
                    <Label className="text-blue-200">Vehículo y Problema</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                              placeholder="Marca, modelo y descripción del problema" 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-white text-blue-700 hover:bg-blue-50">
                    <Wrench className="w-4 h-4 mr-2" />
                    Solicitar Cotización
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