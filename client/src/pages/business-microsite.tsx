import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare, ChevronLeft, ChevronRight, Verified, Award, Navigation, Globe, Users, TrendingUp } from "lucide-react";
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
import { useState, useEffect } from "react";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [googleData, setGoogleData] = useState<any>(null);
  const [isNavSticky, setIsNavSticky] = useState(false);

  console.log("BusinessMicrosite: slug =", slug);

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: !!slug,
  });

  // Google Places enrichment mutation
  const enrichBusinessMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const response = await fetch(`/api/dashboard/businesses/${businessId}/enrich-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGoogleData(data);
    }
  });

  // Sticky navigation effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavSticky(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-enrich with Google data when business loads
  useEffect(() => {
    if (micrositeData?.business?.id && !googleData) {
      enrichBusinessMutation.mutate(micrositeData.business.id);
    }
  }, [micrositeData?.business?.id]);

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
  const categoryInfo = categories.find(c => c.id === business.category);

  // Combine local and Google photos
  const allPhotos = [
    ...(gallery || []).map(item => ({ url: item.imageUrl, title: item.title, source: 'local' })),
    ...(googleData?.photos || []).map(photo => ({ url: photo.url, title: 'Google Places', source: 'google' }))
  ];

  // Get current time for business hours
  const getCurrentStatus = () => {
    if (!settings?.workingHours) return null;
    
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);
    
    const todayHours = settings.workingHours[currentDay];
    if (!todayHours?.enabled) return { open: false, message: 'Cerrado hoy' };
    
    return {
      open: currentTime >= todayHours.start && currentTime <= todayHours.end,
      message: `${todayHours.start} - ${todayHours.end}`
    };
  };

  const businessStatus = getCurrentStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isNavSticky ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className={`font-bold transition-all ${
                  isNavSticky ? 'text-gray-900 text-lg' : 'text-white text-xl drop-shadow-lg'
                }`}>{business.name}</h2>
                {businessStatus && (
                  <div className={`flex items-center text-xs ${
                    businessStatus.open ? 'text-green-600' : 'text-red-600'
                  } ${
                    isNavSticky ? '' : 'text-white drop-shadow'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      businessStatus.open ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    {businessStatus.open ? 'Abierto' : 'Cerrado'} • {businessStatus.message}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {settings?.publicPhone && (
                <a href={`tel:${settings.publicPhone}`}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Llamar
                  </Button>
                </a>
              )}
              {settings?.enablePublicBooking && (
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reservar
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Background Image/Carousel */}
        {allPhotos.length > 0 ? (
          <div className="absolute inset-0">
            <img 
              src={allPhotos[currentImageIndex]?.url || settings?.coverImage}
              alt={business.name}
              className="w-full h-full object-cover opacity-60"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2000&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40"></div>
            
            {/* Photo Navigation */}
            {allPhotos.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button 
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % allPhotos.length)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                
                {/* Photo Indicators */}
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {allPhotos.slice(0, 10).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800"></div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-4 mb-6">
                {settings?.profileImage ? (
                  <img 
                    src={settings.profileImage} 
                    alt={business.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur border-4 border-white/20 flex items-center justify-center text-white font-bold text-3xl shadow-2xl">
                    {business.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div>
                  <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
                    {business.name}
                  </h1>
                  {settings?.professionalTitle && (
                    <p className="text-xl text-white/90 drop-shadow">{settings.professionalTitle}</p>
                  )}
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                {categoryInfo && (
                  <Badge className="bg-white/10 border-white/20 text-white backdrop-blur-sm px-4 py-2 text-sm">
                    {categoryInfo.name}
                  </Badge>
                )}
                
                {googleData?.rating && (
                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-2" />
                    <span className="text-white font-medium">{googleData.rating}</span>
                    <span className="text-white/70 text-sm ml-1">({googleData.reviewCount} reseñas)</span>
                    <Verified className="w-4 h-4 text-blue-400 ml-2" />
                  </div>
                )}
                
                {businessStatus && (
                  <div className={`flex items-center backdrop-blur-sm rounded-full px-4 py-2 border ${
                    businessStatus.open 
                      ? 'bg-green-500/20 border-green-400/30 text-green-100' 
                      : 'bg-red-500/20 border-red-400/30 text-red-100'
                  }`}>
                    <div className={`w-3 h-3 rounded-full mr-2 animate-pulse ${
                      businessStatus.open ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    {businessStatus.open ? 'Abierto ahora' : 'Cerrado'}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-xl text-white/90 mb-8 max-w-2xl drop-shadow leading-relaxed">
                {googleData?.description || settings?.publicDescription || business.description || "Descubre nuestros servicios de calidad y atención personalizada."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {settings?.enablePublicBooking && (
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white shadow-xl px-8 py-4 text-lg">
                    <Calendar className="w-5 h-5 mr-3" />
                    Reservar Cita
                  </Button>
                )}
                
                {settings?.publicPhone && (
                  <a href={`tel:${settings.publicPhone}`}>
                    <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm shadow-xl px-8 py-4 text-lg">
                      <Phone className="w-5 h-5 mr-3" />
                      {settings.publicPhone}
                    </Button>
                  </a>
                )}
                
                {(settings?.streetAddress || business.address) && (
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm shadow-xl px-8 py-4 text-lg">
                    <Navigation className="w-5 h-5 mr-3" />
                    Cómo llegar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>


      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Google Maps Integration */}
            {googleData?.location && (
              <Card className="overflow-hidden shadow-lg">
                <CardContent className="p-0">
                  <div className="h-80 relative">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(googleData.name + ' ' + googleData.address)}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-t-lg"
                    />
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 text-red-600 mr-2" />
                        <span className="font-medium">{googleData.address || business.address}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About with Google enrichment */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Acerca de nosotros
                  {googleData && (
                    <Badge className="ml-auto bg-blue-100 text-blue-800">
                      <Verified className="w-3 h-3 mr-1" />
                      Verificado con Google
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {googleData?.description || settings?.publicDescription || business.description || "Información no disponible."}
                </p>
                
                {/* Google Business Stats */}
                {googleData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                    {googleData.rating && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-lg ml-1">{googleData.rating}</span>
                        </div>
                        <p className="text-sm text-gray-600">Calificación</p>
                      </div>
                    )}
                    {googleData.reviewCount && (
                      <div className="text-center">
                        <div className="font-bold text-lg text-blue-600">{googleData.reviewCount}</div>
                        <p className="text-sm text-gray-600">Reseñas</p>
                      </div>
                    )}
                    {googleData.priceLevel && (
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-600">
                          {'$'.repeat(googleData.priceLevel)}
                        </div>
                        <p className="text-sm text-gray-600">Precio</p>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-sm text-gray-600">En Google Maps</p>
                    </div>
                  </div>
                )}
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

            {/* Enhanced Gallery with Google Photos */}
            {allPhotos.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      Galería de Fotos
                    </div>
                    <Badge variant="outline">{allPhotos.length} fotos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allPhotos.slice(0, 12).map((photo, index) => (
                      <div key={index} className="relative group cursor-pointer" onClick={() => setCurrentImageIndex(index)}>
                        <img 
                          src={photo.url} 
                          alt={photo.title || "Foto del negocio"}
                          className="w-full h-32 object-cover rounded-lg transition-transform group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <div className="text-center text-white">
                            <Camera className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-medium">{photo.title}</p>
                            {photo.source === 'google' && (
                              <Badge className="mt-1 bg-blue-600 text-white text-xs">
                                Google
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {allPhotos.length > 12 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" size="sm">
                        Ver todas las fotos ({allPhotos.length})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Enhanced Reviews with Google Reviews */}
            {((reviews && reviews.length > 0) || (googleData?.reviews && googleData.reviews.length > 0)) && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-400 fill-yellow-400" />
                      Reseñas de Clientes
                    </div>
                    {googleData?.rating && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                          <span className="font-bold">{googleData.rating}</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          Google
                        </Badge>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Google Reviews */}
                    {googleData?.reviews && googleData.reviews.slice(0, 3).map((review, index) => (
                      <div key={`google-${index}`} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {review.profilePhoto && (
                              <img 
                                src={review.profilePhoto} 
                                alt={review.author}
                                className="w-10 h-10 rounded-full mr-3"
                              />
                            )}
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900">{review.author}</span>
                                <Badge className="ml-2 bg-blue-600 text-white text-xs">
                                  Google
                                </Badge>
                              </div>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                                <span className="ml-2 text-sm text-gray-500">
                                  {new Date(review.time * 1000).toLocaleDateString('es-PE')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.text}</p>
                      </div>
                    ))}
                    
                    {/* Local Reviews */}
                    {reviews && reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm mr-3">
                              {review.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900">{review.clientName}</span>
                                <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                                  Mi Cita
                                </Badge>
                              </div>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                  
                  {googleData?.reviewCount && googleData.reviewCount > 3 && (
                    <div className="mt-6 text-center">
                      <Button variant="outline" size="sm">
                        Ver todas las reseñas en Google ({googleData.reviewCount})
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
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

            {/* Booking Widget */}
            {settings?.enablePublicBooking && services && services.length > 0 && (
              <BookingWidget 
                services={services} 
                businessId={business.id}
                workingHours={settings?.workingHours}
                blockedDates={settings?.blockedDates}
                blockedHours={settings?.blockedHours}
              />
            )}

            {/* Contact Form */}
            {settings?.enableContactForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Enviar Mensaje
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="contact-name">Nombre</Label>
                    <Input id="contact-name" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input id="contact-email" type="email" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <Label htmlFor="contact-message">Mensaje</Label>
                    <Textarea id="contact-message" placeholder="Escribe tu mensaje..." rows={4} />
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Enviar Mensaje
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}