import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import PublicHeader from "@/components/public-header";
import BookingWidget from "@/components/booking-widget";

export default function BusinessMicrosite() {
  const [match, params] = useRoute("/negocio/:slug");
  const { slug } = params || {};

  const { data: businessData, isLoading } = useQuery({
    queryKey: [`/api/business/${slug}`],
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Negocio no encontrado</h1>
          <p className="text-gray-600">El negocio que buscas no existe o ha sido desactivado.</p>
        </div>
      </div>
    );
  }

  const { business, services, gallery, reviews } = businessData;
  const rating = parseFloat(business.rating || "0");

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      {/* Hero Section */}
      <div className="relative">
        <img
          src={business.coverImage || "https://images.unsplash.com/photo-1600334129128-685c5582fd35"}
          alt={business.name}
          className="w-full h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
          <p className="text-xl opacity-90">Tu destino para servicios de calidad</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Business Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-red-100 text-red-800">
                    {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
                  </Badge>
                  
                  {rating > 0 && (
                    <div className="flex items-center">
                      <div className="flex text-yellow-400 mr-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < rating ? "fill-current" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-600">
                        {rating.toFixed(1)} ({business.reviewCount || 0} reseñas)
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">Sobre Nosotros</h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {business.description || "Bienvenido a nuestro negocio. Ofrecemos servicios de alta calidad con atención personalizada."}
                </p>
                
                <div className="flex items-center space-x-6 text-gray-600">
                  {business.address && (
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      <span>{business.address}, {business.city}</span>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-2" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuestros Servicios</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service: any) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                        {service.description && (
                          <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-red-600">
                            S/ {service.price}
                          </span>
                          {service.duration && (
                            <span className="text-sm text-gray-500">
                              {service.duration} min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {gallery && gallery.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Galería</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item: any) => (
                      <img
                        key={item.id}
                        src={item.imageUrl}
                        alt={item.caption || "Galería"}
                        className="rounded-lg object-cover w-full h-32 hover:scale-105 transition-transform cursor-pointer"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Información de Contacto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Contacto</h3>
                    <div className="space-y-3">
                      {business.address && (
                        <div className="flex items-center">
                          <MapPin className="text-red-600 mr-3 w-5 h-5" />
                          <span>{business.address}, {business.city}, {business.country}</span>
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex items-center">
                          <Phone className="text-red-600 mr-3 w-5 h-5" />
                          <span>{business.phone}</span>
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center">
                          <Mail className="text-red-600 mr-3 w-5 h-5" />
                          <span>{business.email}</span>
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center">
                          <ExternalLink className="text-red-600 mr-3 w-5 h-5" />
                          <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">
                            Sitio Web
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Horarios de Atención</h3>
                    <div className="space-y-2 text-gray-600">
                      {business.hours ? (
                        Object.entries(business.hours).map(([day, hours]: [string, any]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}</span>
                            <span>
                              {hours.closed ? "Cerrado" : `${hours.open} - ${hours.close}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>Lunes - Viernes</span>
                            <span>9:00 AM - 6:00 PM</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sábados</span>
                            <span>10:00 AM - 4:00 PM</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Domingos</span>
                            <span>Cerrado</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Widget */}
            {services && services.length > 0 && (
              <BookingWidget services={services} businessId={business.id} />
            )}

            {/* Quick Contact */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Contacto Rápido</h3>
                <div className="space-y-3">
                  {business.phone && (
                    <Button className="w-full" variant="outline">
                      <Phone className="w-4 h-4 mr-2" />
                      Llamar
                    </Button>
                  )}
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Phone className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Estado Actual
                </h3>
                <div className="text-center">
                  <div className="text-green-600 font-semibold mb-2">Abierto Ahora</div>
                  <div className="text-sm text-gray-600">Cierra a las 6:00 PM</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
