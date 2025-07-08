import React from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Home, Shield, Wrench, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function HogarTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-50">
      {/* Home Services Hero */}
      <section className="relative h-screen bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Servicios del hogar"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 via-teal-900/80 to-blue-900/80"></div>
          </div>
        )}

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-4xl text-white">
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-24 h-24 rounded-lg border-4 border-green-300 shadow-lg object-cover"
                />
              </div>
            )}

            <Badge className="bg-green-500/20 text-green-200 border-green-300/50 mb-4 text-lg px-4 py-2">
              <Home className="w-5 h-5 mr-2" />
              SERVICIOS PARA EL HOGAR
            </Badge>
            
            <h1 className="text-6xl font-black mb-4 leading-tight">
              {business.name}
            </h1>
            
            {settings?.professionalTitle && (
              <p className="text-2xl text-green-200 mb-6 font-light">
                {settings.professionalTitle}
              </p>
            )}

            <p className="text-xl text-green-100 mb-8 leading-relaxed max-w-3xl">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Solicitar Servicio
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold px-8">
                <Phone className="w-5 h-5 mr-2" />
                Llamar Ahora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Quality */}
      <section className="py-16 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Confiable</h3>
              <p className="text-gray-600">Personal verificado y asegurado</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Garantizado</h3>
              <p className="text-gray-600">Satisfacción 100% garantizada</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Profesional</h3>
              <p className="text-gray-600">Herramientas y técnicas modernas</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Puntual</h3>
              <p className="text-gray-600">Respetamos tu tiempo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-green-50 to-teal-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Nuestros Servicios
              </h2>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                Mantenimiento y cuidado integral para tu hogar
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                          <Home className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                            {service.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            Duración: {service.duration} horas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">S/ {service.price}</div>
                        <div className="text-sm text-gray-500">por servicio</div>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="border-teal-200 text-teal-600">
                        Servicio Completo
                      </Badge>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Solicitar
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
      <section className="py-16 bg-gradient-to-r from-green-700 to-teal-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                ¿Necesitas Ayuda en Casa?
              </h2>
              <p className="text-green-100 text-xl mb-8">
                Déjanos cuidar de tu hogar mientras tú te ocupas de lo importante
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
                          {settings.district && <p className="text-green-200">{settings.district}</p>}
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
                  <CardTitle className="text-white">Solicitar Cotización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-green-200">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-green-200" 
                           placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label className="text-green-200">Servicio Necesario</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-green-200" 
                           placeholder="¿Qué necesitas?" />
                  </div>
                  <div>
                    <Label className="text-green-200">Detalles</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-green-200" 
                              placeholder="Describe el trabajo que necesitas" 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-white text-green-700 hover:bg-green-50">
                    <Home className="w-4 h-4 mr-2" />
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