import React from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, BookOpen, Award, Users, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function EducacionTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Academic Hero */}
      <section className="relative h-screen bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-700 overflow-hidden">
        {settings?.coverImage && (
          <div className="absolute inset-0">
            <img 
              src={settings.coverImage} 
              alt="Centro educativo"
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80"></div>
          </div>
        )}

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-4xl text-white">
            {settings?.profileImage && (
              <div className="mb-6">
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-24 h-24 rounded-lg border-4 border-blue-300 shadow-lg object-cover"
                />
              </div>
            )}

            <Badge className="bg-blue-500/20 text-blue-200 border-blue-300/50 mb-4 text-lg px-4 py-2">
              <BookOpen className="w-5 h-5 mr-2" />
              EXCELENCIA EDUCATIVA
            </Badge>
            
            <h1 className="text-6xl font-black mb-4 leading-tight">
              {business.name}
            </h1>
            
            {settings?.professionalTitle && (
              <p className="text-2xl text-blue-200 mb-6 font-light">
                {settings.professionalTitle}
              </p>
            )}

            <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-3xl">
              {settings?.publicDescription || business.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {settings?.enablePublicBooking && (
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8">
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Información
                </Button>
              )}
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold px-8">
                <BookOpen className="w-5 h-5 mr-2" />
                Ver Programas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Values */}
      <section className="py-16 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Metodología Moderna</h3>
              <p className="text-gray-600">Técnicas de enseñanza innovadoras</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Certificación</h3>
              <p className="text-gray-600">Títulos y certificados reconocidos</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Grupos Pequeños</h3>
              <p className="text-gray-600">Atención personalizada</p>
            </div>
            <div className="group">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Resultados</h3>
              <p className="text-gray-600">Seguimiento del progreso</p>
            </div>
          </div>
        </div>
      </section>

      {/* Programs/Courses */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-gray-800 mb-4">
                Nuestros Programas
              </h2>
              <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                Cursos diseñados para potenciar tu desarrollo académico y profesional
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                          <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {service.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            Duración: {service.duration} horas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">S/ {service.price}</div>
                        <div className="text-sm text-gray-500">por curso</div>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="border-indigo-200 text-indigo-600">
                        Programa Completo
                      </Badge>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Inscribirse
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
      <section className="py-16 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                Comienza tu Aprendizaje
              </h2>
              <p className="text-blue-100 text-xl mb-8">
                Únete a nuestra comunidad educativa y transforma tu futuro
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
                          {settings.district && <p className="text-blue-200">{settings.district}</p>}
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
                  <CardTitle className="text-white">Solicitar Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-blue-200">Nombre</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="Tu nombre completo" />
                  </div>
                  <div>
                    <Label className="text-blue-200">Programa de Interés</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="¿Qué curso te interesa?" />
                  </div>
                  <div>
                    <Label className="text-blue-200">Mensaje</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                              placeholder="Cuéntanos sobre tus objetivos de aprendizaje" 
                              rows={3} />
                  </div>
                  <Button className="w-full bg-white text-blue-700 hover:bg-blue-50">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Solicitar Información
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