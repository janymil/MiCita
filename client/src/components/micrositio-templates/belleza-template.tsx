import React, { useState } from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Camera, MessageSquare, Heart, Award, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function BellezaTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Hero Section with Cover */}
      <div className="relative h-screen bg-gradient-to-r from-pink-600 via-purple-600 to-pink-700 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Portada"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/80 via-purple-600/80 to-pink-700/80"></div>
          </div>
        )}
        
        {/* Floating Sparkles Animation */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <Sparkles 
              key={i}
              className={`absolute text-white/20 animate-pulse`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl text-white">
            {/* Profile Image */}
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-20 h-20 rounded-full border-4 border-white/30 shadow-lg"
                />
              </div>
            )}

            <div className="mb-4">
              <Badge className="bg-white/20 text-white border-white/30 mb-3">
                ✨ Belleza & Estilo
              </Badge>
              <h1 className="text-5xl font-bold mb-3 leading-tight">
                {business.name}
              </h1>
              {settings?.professionalTitle && (
                <p className="text-xl text-pink-100 mb-4 font-light">
                  {settings.professionalTitle}
                </p>
              )}
            </div>

            <p className="text-lg text-pink-50 mb-8 leading-relaxed">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-white text-pink-600 hover:bg-pink-50 font-semibold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Reservar Cita
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Phone className="w-5 h-5 mr-2" />
                Llamar Ahora
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Services Showcase */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Nuestros Servicios de Belleza
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Transformamos tu belleza natural con técnicas profesionales y productos de primera calidad
            </p>
          </div>

          {services && services.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-pink-100 text-pink-700 border-pink-200">
                        S/ {service.price}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-gray-600 mb-4 text-sm">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration} min
                      </div>
                      <Button size="sm" variant="ghost" className="text-pink-600 hover:bg-pink-50">
                        Reservar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      {settings?.enableGallery && gallery && gallery.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Galería de Nuestros Trabajos
              </h2>
              <p className="text-gray-600">
                Descubre los increíbles resultados que hemos logrado con nuestros clientes
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <Dialog key={item.id}>
                  <DialogTrigger asChild>
                    <div className="relative group cursor-pointer overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                      <img 
                        src={item.imageUrl} 
                        alt={item.title || "Trabajo"}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-4 left-4 right-4">
                          {item.title && (
                            <p className="text-white font-medium">{item.title}</p>
                          )}
                          <p className="text-pink-200 text-sm">Click para ver</p>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>{item.title || "Galería"}</DialogTitle>
                    </DialogHeader>
                    <img 
                      src={item.imageUrl} 
                      alt={item.title || "Trabajo"}
                      className="w-full max-h-96 object-contain rounded-lg"
                    />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Lo Que Dicen Nuestras Clientas
              </h2>
              <div className="flex items-center justify-center mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">
                  {reviews.length} reseñas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
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

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                ¿Lista para tu Transformación?
              </h2>
              <p className="text-pink-100 text-lg mb-8">
                Agenda tu cita hoy y déjanos cuidar de tu belleza con el profesionalismo y cariño que mereces.
              </p>

              <div className="space-y-4">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 mr-3" />
                    <span className="text-lg">{settings?.publicPhone || business.phone}</span>
                  </div>
                )}

                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 mr-3" />
                    <span className="text-lg">{settings?.publicEmail || business.email}</span>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 mr-3 mt-1" />
                    <div>
                      {settings?.streetAddress ? (
                        <>
                          <p className="text-lg">{settings.streetAddress}</p>
                          {settings.district && <p className="text-pink-200">{settings.district}</p>}
                          {settings.region && <p className="text-pink-200">{settings.region}</p>}
                        </>
                      ) : (
                        <p className="text-lg">{business.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
                <div className="mt-8">
                  <p className="text-pink-200 mb-4">Síguenos en redes sociales:</p>
                  <div className="flex space-x-4">
                    {settings?.facebookUrl && (
                      <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" 
                         className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {settings?.instagramUrl && (
                      <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer"
                         className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Envíanos un Mensaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-pink-100">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-pink-200" 
                           placeholder="Tu nombre completo" />
                  </div>
                  <div>
                    <Label className="text-pink-100">Teléfono</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-pink-200" 
                           placeholder="Tu número de teléfono" />
                  </div>
                  <div>
                    <Label className="text-pink-100">Mensaje</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-pink-200" 
                              placeholder="¿En qué podemos ayudarte?" 
                              rows={4} />
                  </div>
                  <Button className="w-full bg-white text-pink-600 hover:bg-pink-50">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Mensaje
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