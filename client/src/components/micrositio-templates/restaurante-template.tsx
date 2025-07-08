import React from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, ChefHat, Utensils, Heart, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function RestauranteTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Hero with Food Vibes */}
      <section className="relative h-screen bg-gradient-to-r from-orange-600 via-red-500 to-yellow-600 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Restaurante"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-red-900/70 to-yellow-900/80"></div>
          </div>
        )}

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-3xl text-white">
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-24 h-24 rounded-full border-4 border-orange-300 shadow-lg object-cover"
                />
              </div>
            )}

            <Badge className="bg-orange-500/20 text-orange-200 border-orange-300/50 mb-4 text-lg px-4 py-2">
              <ChefHat className="w-5 h-5 mr-2" />
              EXPERIENCIA GASTRONÓMICA
            </Badge>
            
            <h1 className="text-6xl font-black mb-4 leading-tight">
              {business.name}
            </h1>
            
            {settings?.professionalTitle && (
              <p className="text-2xl text-orange-200 mb-6 font-light">
                {settings.professionalTitle}
              </p>
            )}

            <p className="text-xl text-orange-100 mb-8 leading-relaxed">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Reservar Mesa
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold px-8">
                <Utensils className="w-5 h-5 mr-2" />
                Ver Menú
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Menu/Services Section */}
      {services && services.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Nuestro Menú
              </h2>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                Sabores auténticos preparados con ingredientes frescos y amor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center">
                      <Utensils className="w-16 h-16 text-white opacity-50" />
                    </div>
                    <Badge className="absolute top-4 right-4 bg-red-500 text-white border-0">
                      S/ {service.price}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration} min prep
                      </div>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        Ordenar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {settings?.enableGallery && gallery && gallery.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-orange-100 to-red-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Nuestros Platos
              </h2>
              <p className="text-gray-600 text-xl">
                Cada plato es una obra de arte culinaria
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item) => (
                <div key={item.id} className="relative group overflow-hidden rounded-xl shadow-lg">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title || "Plato"}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                      {item.title && (
                        <h3 className="text-white text-xl font-bold">{item.title}</h3>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Reseñas de Comensales
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white font-bold">
                        {review.clientName.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-gray-800">{review.clientName}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600 italic">"{review.comment}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                ¡Te Esperamos!
              </h2>
              <p className="text-orange-100 text-xl mb-8">
                Ven y disfruta de una experiencia gastronómica inolvidable
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
                          {settings.district && <p className="text-orange-200">{settings.district}</p>}
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
                  <CardTitle className="text-white">Reservar Mesa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-orange-200">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-orange-200" 
                           placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label className="text-orange-200">Personas</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-orange-200" 
                           placeholder="Número de personas" />
                  </div>
                  <div>
                    <Label className="text-orange-200">Comentarios</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-orange-200" 
                              placeholder="Ocasión especial, alergias, etc." 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-white text-orange-600 hover:bg-orange-50">
                    <Calendar className="w-4 h-4 mr-2" />
                    Enviar Reserva
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