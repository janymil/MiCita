import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="h-64 bg-gray-200"></div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !micrositeData) {
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
  const categoryInfo = BUSINESS_CATEGORIES.find(c => c.id === business.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-gray-600 font-medium">{settings.professionalTitle}</p>
                )}
                {categoryInfo && (
                  <Badge variant="secondary" className="mt-1">
                    {categoryInfo.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {settings?.publicPhone && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              )}
              {settings?.enablePublicBooking && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reservar Cita
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {settings?.coverImage && (
        <div className="h-64 md:h-80 bg-gradient-to-r from-gray-200 to-gray-300 relative overflow-hidden">
          <img 
            src={settings.coverImage} 
            alt="Portada"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Acerca de nosotros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {settings?.publicDescription || business.description || "Información no disponible."}
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    Nuestros Servicios
                    <Badge variant="outline" className="ml-3">
                      {services.length} servicios
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service: any) => (
                      <div key={service.id} className="border rounded-xl p-4 bg-white/60">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{service.name}</h3>
                          <span className="text-red-600 font-bold text-lg">
                            S/ {service.price}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {service.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Galería de Trabajos
                    <Badge variant="outline" className="ml-3">
                      {gallery.length} fotos
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item: any) => (
                      <div key={item.id} className="relative overflow-hidden rounded-xl shadow-md">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || "Trabajo"}
                          className="w-full h-32 object-cover"
                        />
                        {item.title && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            <p className="text-white text-sm font-medium text-center px-2">{item.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    Reseñas de Clientes
                    <Badge variant="outline" className="ml-3">
                      {reviews.length} reseñas
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex items-center mb-3">
                          <div className="flex mr-3">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="font-medium text-gray-900">{review.clientName}</span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 italic">"{review.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.publicPhone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">{settings.publicPhone}</span>
                  </div>
                )}
                
                {settings?.publicEmail && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">{settings.publicEmail}</span>
                  </div>
                )}
                
                {settings?.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-1" />
                    <span className="text-gray-700">{settings.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours */}
            {settings?.workingHours && (
              <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Horarios de Atención
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(settings.workingHours).map(([day, hours]: [string, any]) => (
                      <div key={day} className="flex justify-between items-center">
                        <span className="text-gray-700 capitalize">{day}</span>
                        <span className="text-gray-900">
                          {hours.closed ? 'Cerrado' : `${hours.open} - ${hours.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Media */}
            {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
              <Card className="bg-white/70 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Síguenos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-3">
                    {settings?.facebookUrl && (
                      <a 
                        href={settings.facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {settings?.instagramUrl && (
                      <a 
                        href={settings.instagramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-pink-600 text-white rounded-full hover:bg-pink-700"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {settings?.youtubeUrl && (
                      <a 
                        href={settings.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}