import React, { useState } from 'react';
import { Star, Phone, Mail, MapPin, Clock, Calendar, Shield, Award, Heart, UserCheck, Stethoscope } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { MicrositioTemplateProps } from './index';

export function SaludTemplate({ data }: MicrositioTemplateProps) {
  const { business, settings, services, gallery, reviews } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Professional Header */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-green-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Profile Section */}
            <div className="flex flex-col items-center lg:items-start">
              {settings?.profileImage && (
                <div className="mb-4">
                  <img 
                    src={settings.profileImage} 
                    alt={business.name}
                    className="w-32 h-32 rounded-full border-4 border-white/30 shadow-lg object-cover"
                  />
                </div>
              )}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-3">
                  <Shield className="w-6 h-6 mr-2" />
                  <Badge className="bg-white/20 text-white border-white/30">
                    Profesional de la Salud
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-xl text-blue-100 mb-4">
                    {settings.professionalTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Info & Actions */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-lg text-blue-50 mb-6 leading-relaxed max-w-2xl">
                {settings?.publicDescription || business.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {settings?.enablePublicBooking && (
                  <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                    <Calendar className="w-5 h-5 mr-2" />
                    Agendar Consulta
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Phone className="w-5 h-5 mr-2" />
                  Contactar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Atención Profesional</h3>
              <p className="text-gray-600">Cuidado médico con los más altos estándares de calidad</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Cuidado Personalizado</h3>
              <p className="text-gray-600">Tratamiento individualizado para cada paciente</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Experiencia Comprobada</h3>
              <p className="text-gray-600">Años de experiencia al servicio de tu salud</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {services && services.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Servicios Médicos
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Ofrecemos una amplia gama de servicios médicos con la más alta calidad y profesionalismo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          <Stethoscope className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{service.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} minutos
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">S/ {service.price}</div>
                        <div className="text-sm text-gray-500">por consulta</div>
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-600 mb-4">{service.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Consulta Profesional
                      </Badge>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {settings?.coverImage && (
                <img 
                  src={settings.coverImage} 
                  alt="Instalaciones médicas"
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
              )}
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                Tu Salud, Nuestra Prioridad
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {settings?.publicDescription || business.description || 
                "Brindamos atención médica integral con un enfoque humano y profesional. Nuestro compromiso es ofrecerte el mejor cuidado para tu salud y bienestar."}
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <UserCheck className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Atención personalizada</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-gray-700">Protocolos de seguridad</span>
                </div>
                <div className="flex items-center">
                  <Award className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-gray-700">Profesionales certificados</span>
                </div>
              </div>

              {settings?.enablePublicBooking && (
                <div className="mt-8">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    <Calendar className="w-5 h-5 mr-2" />
                    Agendar Consulta
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Patient Reviews */}
      {reviews && reviews.length > 0 && (
        <section className="py-16 bg-blue-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Testimonios de Pacientes
              </h2>
              <p className="text-gray-600">
                La confianza de nuestros pacientes es nuestro mayor reconocimiento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <Card key={review.id} className="bg-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
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
                      <blockquote className="text-gray-600 italic">
                        "{review.comment}"
                      </blockquote>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & Appointment */}
      <section className="py-16 bg-gradient-to-r from-blue-700 to-green-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Contacto y Ubicación
              </h2>
              <p className="text-blue-100 text-lg mb-8">
                Estamos aquí para cuidar de tu salud. Contáctanos para agendar tu consulta.
              </p>

              <div className="space-y-6">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-200">Teléfono</p>
                      <p className="text-lg font-semibold">{settings?.publicPhone || business.phone}</p>
                    </div>
                  </div>
                )}

                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-200">Email</p>
                      <p className="text-lg font-semibold">{settings?.publicEmail || business.email}</p>
                    </div>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-200">Dirección</p>
                      {settings?.streetAddress ? (
                        <div className="text-lg">
                          <p>{settings.streetAddress}</p>
                          {settings.district && <p className="text-blue-200">{settings.district}</p>}
                          {settings.region && <p className="text-blue-200">{settings.region}</p>}
                        </div>
                      ) : (
                        <p className="text-lg">{business.address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {(settings?.facebookUrl || settings?.instagramUrl) && (
                <div className="mt-8">
                  <p className="text-blue-200 mb-4">Síguenos:</p>
                  <div className="flex space-x-4">
                    {settings?.facebookUrl && (
                      <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" 
                         className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card className="bg-white/10 border-white/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Solicitar Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-blue-100">Nombre Completo</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="Ingresa tu nombre" />
                  </div>
                  <div>
                    <Label className="text-blue-100">Teléfono</Label>
                    <Input className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                           placeholder="Tu número de contacto" />
                  </div>
                  <div>
                    <Label className="text-blue-100">Consulta</Label>
                    <Textarea className="bg-white/20 border-white/30 text-white placeholder:text-blue-200" 
                              placeholder="Describe tu consulta o motivo de la cita" 
                              rows={4} />
                  </div>
                  <Button className="w-full bg-white text-blue-700 hover:bg-blue-50">
                    <Calendar className="w-4 h-4 mr-2" />
                    Enviar Solicitud
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