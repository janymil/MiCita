import React, { useState } from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Zap, Target, Trophy, Users, Dumbbell, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function FitnessTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Dynamic Hero Section */}
      <section className="relative h-screen overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-purple-700">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Gym"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-red-900/80 to-purple-900/80"></div>
          </div>
        )}

        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white/5 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl">
            {/* Profile Image */}
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-24 h-24 rounded-full border-4 border-orange-400 shadow-lg object-cover"
                />
              </div>
            )}

            <div className="mb-6">
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/50 mb-4 text-lg px-4 py-2">
                <Zap className="w-5 h-5 mr-2" />
                ENTRENAMIENTOS DE ÉLITE
              </Badge>
              <h1 className="text-6xl font-black mb-4 leading-tight bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
                {business.name}
              </h1>
              {settings?.professionalTitle && (
                <p className="text-2xl text-orange-200 mb-4 font-light">
                  {settings.professionalTitle}
                </p>
              )}
            </div>

            <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-2xl">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-8 py-4 text-lg">
                  <Calendar className="w-6 h-6 mr-2" />
                  RESERVAR ENTRENAMIENTO
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-2 border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black font-bold px-8 py-4 text-lg">
                <Play className="w-6 h-6 mr-2" />
                VER PROGRAMAS
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-orange-400 rounded-full flex justify-center">
            <div className="w-2 h-4 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-orange-400 mb-2">500+</h3>
              <p className="text-gray-400">Miembros Activos</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-purple-400 mb-2">95%</h3>
              <p className="text-gray-400">Objetivos Alcanzados</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-green-400 mb-2">10+</h3>
              <p className="text-gray-400">Entrenadores</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-red-400 mb-2">24/7</h3>
              <p className="text-gray-400">Acceso al Gym</p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs/Services Section */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                PROGRAMAS DE ENTRENAMIENTO
              </h2>
              <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                Transforma tu cuerpo y mente con nuestros programas diseñados por expertos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card key={service.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/20 hover:border-orange-500/50 transition-all duration-300 group hover:scale-105">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Dumbbell className="w-8 h-8 text-white" />
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-lg px-3 py-1">
                        S/ {service.price}
                      </Badge>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                      {service.name}
                    </h3>
                    
                    {service.description && (
                      <p className="text-gray-400 mb-4 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{service.duration} min</span>
                      </div>
                      <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                        INTENSIVO
                      </Badge>
                    </div>
                    
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold">
                      EMPEZAR AHORA
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery/Gym Tour */}
      {settings?.enableGallery && gallery && gallery.length > 0 && (
        <section className="py-16 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                TOUR VIRTUAL
              </h2>
              <p className="text-gray-400 text-xl">
                Conoce nuestras instalaciones de primera clase
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item) => (
                <div key={item.id} className="relative group overflow-hidden rounded-lg shadow-2xl">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title || "Gym"}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      {item.title && (
                        <h3 className="text-white text-xl font-bold mb-2">{item.title}</h3>
                      )}
                      <div className="flex items-center">
                        <Play className="w-5 h-5 text-orange-400 mr-2" />
                        <span className="text-orange-400 font-semibold">Ver en 360°</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Success Stories */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                HISTORIAS DE ÉXITO
              </h2>
              <p className="text-gray-400 text-xl">
                Nuestros miembros han logrado transformaciones increíbles
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-gradient-to-br from-gray-800 to-black border-green-500/20">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                        {review.clientName.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <p className="text-white font-bold text-lg">{review.clientName}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {review.comment && (
                      <blockquote className="text-gray-300 italic text-lg leading-relaxed">
                        "{review.comment}"
                      </blockquote>
                    )}
                    
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        TRANSFORMACIÓN EXITOSA
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-orange-600 via-red-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-black text-white mb-6 leading-tight">
                ¿LISTO PARA CAMBIAR TU VIDA?
              </h2>
              <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                No esperes más. Tu transformación comienza hoy. Únete a nuestra comunidad de atletas y alcanza tus objetivos más ambiciosos.
              </p>

              <div className="space-y-6 mb-8">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Phone className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-orange-200">Llámanos</p>
                      <p className="text-2xl font-bold text-white">{settings?.publicPhone || business.phone}</p>
                    </div>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <MapPin className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-orange-200">Ubicación</p>
                      {settings?.streetAddress ? (
                        <div className="text-xl text-white">
                          <p>{settings.streetAddress}</p>
                          {settings.district && <p className="text-orange-200">{settings.district}</p>}
                        </div>
                      ) : (
                        <p className="text-xl text-white">{business.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {settings?.enablePublicBooking && (
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 font-black px-8 py-4 text-lg">
                    <Calendar className="w-6 h-6 mr-2" />
                    RESERVAR SESIÓN GRATIS
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-orange-600 font-black px-8 py-4 text-lg">
                  <Phone className="w-6 h-6 mr-2" />
                  LLAMAR AHORA
                </Button>
              </div>
            </div>

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card className="bg-black/30 border-white/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white text-2xl font-bold">EMPEZAR MI TRANSFORMACIÓN</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-orange-200 font-semibold">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-gray-300 h-12" 
                           placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label className="text-orange-200 font-semibold">Teléfono</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-gray-300 h-12" 
                           placeholder="Tu número" />
                  </div>
                  <div>
                    <Label className="text-orange-200 font-semibold">Objetivo</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-gray-300" 
                              placeholder="¿Cuál es tu objetivo fitness?" 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black h-12 text-lg">
                    <Zap className="w-5 h-5 mr-2" />
                    COMENZAR AHORA
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Booking Widget */}
      {settings?.enablePublicBooking && (
        <BookingWidget businessId={business.id} />
      )}
    </div>
  );
}