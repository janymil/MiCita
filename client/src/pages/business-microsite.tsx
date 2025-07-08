import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();

  console.log("BusinessMicrosite: slug =", slug);

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: !!slug,
  });

  console.log("BusinessMicrosite: micrositeData =", micrositeData);
  console.log("BusinessMicrosite: isLoading =", isLoading);
  console.log("BusinessMicrosite: error =", error);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando micrositio...</p>
        </div>
      </div>
    );
  }

  if (error || !micrositeData) {
    // If the slug doesn't match any business, show 404 or redirect to home
    // This prevents showing business microsite for system routes like /dashboard
    if (slug && (slug.startsWith('dashboard') || slug === 'login' || slug === 'registro' || slug === 'business' || slug === 'buscar')) {
      return null; // Let the router handle these routes normally
    }

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
  const categoryInfo = categories.find(c => c.id === business.category) || { name: business.category, icon: "briefcase", color: "category-general" };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-6">
            {settings?.profileImage && (
              <img 
                src={settings.profileImage} 
                alt={business.name}
                className="w-20 h-20 rounded-full border-4 border-white/20"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold">{business.name}</h1>
              {settings?.professionalTitle && (
                <p className="text-xl text-blue-100 mt-2">{settings.professionalTitle}</p>
              )}
              <Badge className="mt-2 bg-white/20 text-white">
                {categoryInfo.name}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {settings?.coverImage && (
        <div className="h-80 bg-gray-200">
          <img 
            src={settings.coverImage} 
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            {/* About */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Acerca de nosotros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {settings?.publicDescription || business.description}
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Servicios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div key={service.id} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{service.name}</h3>
                            {service.description && (
                              <p className="text-gray-600 text-sm">{service.description}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {service.duration} minutos
                            </p>
                          </div>
                          <span className="text-lg font-bold text-blue-600">
                            S/ {service.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gallery */}
            {settings?.enableGallery && gallery && gallery.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Galería</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item) => (
                      <img 
                        key={item.id}
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Contact Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{settings?.publicPhone || business.phone}</span>
                  </div>
                )}
                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{settings?.publicEmail || business.email}</span>
                  </div>
                )}
                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500 mt-1" />
                    <span>{settings?.streetAddress || business.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hours */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Horarios</CardTitle>
              </CardHeader>
              <CardContent>
                {settings?.workingHours ? (
                  <div className="space-y-2">
                    {Object.entries(settings.workingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize">
                          {day === 'monday' ? 'Lunes' :
                           day === 'tuesday' ? 'Martes' :
                           day === 'wednesday' ? 'Miércoles' :
                           day === 'thursday' ? 'Jueves' :
                           day === 'friday' ? 'Viernes' :
                           day === 'saturday' ? 'Sábado' : 'Domingo'}
                        </span>
                        <span>
                          {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {(settings?.facebookUrl || settings?.instagramUrl || settings?.youtubeUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Redes Sociales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    {settings?.facebookUrl && (
                      <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Facebook className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {settings?.instagramUrl && (
                      <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Instagram className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {settings?.youtubeUrl && (
                      <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Youtube className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Booking Widget */}
      {settings?.enablePublicBooking && (
        <BookingWidget 
          businessId={business.id} 
          services={services || []}
          workingHours={settings?.workingHours}
          blockedDates={settings?.blockedDates}
          blockedHours={settings?.blockedHours}
        />
      )}
    </div>
  );
}