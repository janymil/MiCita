import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { formatDatePeruvian } from "@/lib/utils";

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <header className="bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {settings?.profileImage && (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-16 h-16 rounded-full border-2 border-white/30 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">{business.name}</h1>
                {settings?.professionalTitle && (
                  <p className="text-red-100">{settings.professionalTitle}</p>
                )}
                <Badge className="bg-white/20 text-white border-white/30 mt-1">
                  {categoryInfo.name}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(settings?.publicPhone || business.phone) && (
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
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
        <div className="h-64 bg-gray-200 relative">
          <img 
            src={settings.coverImage} 
            alt="Portada"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>Acerca de nosotros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {settings?.publicDescription || business.description || "Información no disponible."}
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            {services && services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Nuestros Servicios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <span className="text-red-600 font-bold">S/ {service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm mb-2">{service.description}</p>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Galería de Trabajos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gallery.map((item) => (
                      <div key={item.id} className="relative group">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title || "Trabajo"}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {item.title && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <p className="text-white text-sm font-medium">{item.title}</p>
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
              <Card>
                <CardHeader>
                  <CardTitle>Reseñas de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex items-center mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="ml-2 font-medium">{review.clientName}</span>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600">{review.comment}</p>
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
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings?.publicPhone || business.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-3 text-gray-500" />
                    <span>{settings?.publicPhone || business.phone}</span>
                  </div>
                )}

                {(settings?.publicEmail || business.email) && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-gray-500" />
                    <span>{settings?.publicEmail || business.email}</span>
                  </div>
                )}

                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-3 text-gray-500 mt-1" />
                    <div>
                      {settings?.streetAddress ? (
                        <>
                          <p>{settings.streetAddress}</p>
                          {settings.district && <p className="text-sm text-gray-600">{settings.district}</p>}
                          {settings.region && <p className="text-sm text-gray-600">{settings.region}</p>}
                          {settings.postalCode && <p className="text-sm text-gray-600">{settings.postalCode}</p>}
                          {settings.country && <p className="text-sm text-gray-600">{settings.country}</p>}
                        </>
                      ) : (
                        <p>{business.address}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Media Links */}
                {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
                  <div>
                    <div className="border-t pt-4 mt-4">
                      <Label className="text-sm text-gray-600 mb-3 block">Redes Sociales</Label>
                      <div className="flex space-x-3">
                        {settings?.facebookUrl && (
                          <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.instagramUrl && (
                          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.tiktokUrl && (
                          <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                          </a>
                        )}
                        {settings?.youtubeUrl && (
                          <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Horarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settings?.workingHours ? (
                  <div className="space-y-2">
                    {Object.entries(settings.workingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize font-medium">
                          {day === 'monday' ? 'Lunes' :
                           day === 'tuesday' ? 'Martes' :
                           day === 'wednesday' ? 'Miércoles' :
                           day === 'thursday' ? 'Jueves' :
                           day === 'friday' ? 'Viernes' :
                           day === 'saturday' ? 'Sábado' : 'Domingo'}:
                        </span>
                        <span className={hours.enabled ? 'text-gray-900' : 'text-gray-500 italic'}>
                          {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Horarios no disponibles</p>
                )}

                {settings?.scheduleNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">{settings.scheduleNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            {(settings?.facebookUrl || settings?.instagramUrl || settings?.tiktokUrl || settings?.youtubeUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Síguenos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4">
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
                    {settings?.tiktokUrl && (
                      <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Twitter className="w-4 h-4" />
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

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Contáctanos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre</Label>
                    <Input id="name" placeholder="Tu nombre completo" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" placeholder="Tu número de teléfono" />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea 
                      id="message"
                      placeholder="¿En qué podemos ayudarte?" 
                      rows={4} 
                    />
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Mensaje
                  </Button>
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