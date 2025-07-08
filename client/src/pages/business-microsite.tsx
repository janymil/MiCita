import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Star, Phone, Mail, MapPin, Clock, Calendar, Facebook, Instagram, Youtube, Twitter, ExternalLink, Camera, MessageSquare, Shield, MapPin as MapIcon, ArrowLeft, ArrowRight, Play, CheckCircle, Globe, Users, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import BookingWidget from "@/components/booking-widget";
import { categories } from "@/lib/constants";
import { formatDatePeruvian, cn } from "@/lib/utils";

export default function BusinessMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showBookingWidget, setShowBookingWidget] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  console.log("BusinessMicrosite: slug =", slug);

  const { data: micrositeData, isLoading, error } = useQuery({
    queryKey: [`/api/micrositio/${slug}`],
    enabled: !!slug,
  });

  // Fetch Google Places enrichment data
  const enrichBusinessMutation = useMutation({
    mutationFn: async (businessId: number) => {
      const response = await fetch(`/api/dashboard/businesses/${businessId}/enrich-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.enrichedData) {
        setEnrichedData(data.enrichedData);
      }
    },
    onError: (error) => {
      console.log('Google enrichment failed:', error);
    }
  });

  // Auto-enrich business data when component loads
  useEffect(() => {
    if (micrositeData?.business?.id && !enrichedData) {
      enrichBusinessMutation.mutate(micrositeData.business.id);
    }
  }, [micrositeData?.business?.id]);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  console.log("BusinessMicrosite: micrositeData =", micrositeData);
  console.log("BusinessMicrosite: isLoading =", isLoading);
  console.log("BusinessMicrosite: error =", error);
  console.log("BusinessMicrosite: enrichedData =", enrichedData);

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
  
  // Combine local and Google data
  const combinedPhotos = [
    ...(gallery || []).map(item => ({ 
      url: item.imageUrl, 
      title: item.title || 'Galería', 
      type: 'local' 
    })),
    ...(enrichedData?.photos || []).map((photo: any) => ({ 
      url: photo.url, 
      title: 'Google Photos', 
      type: 'google' 
    }))
  ];
  
  const combinedReviews = [
    ...(reviews || []).map(review => ({
      ...review,
      author: review.clientName,
      text: review.comment,
      type: 'local',
      time: review.createdAt
    })),
    ...(enrichedData?.reviews || []).map((review: any) => ({
      ...review,
      clientName: review.author,
      comment: review.text,
      type: 'google'
    }))
  ];
  
  const businessRating = enrichedData?.rating || parseFloat(business.rating || "0");
  const businessReviewCount = enrichedData?.reviewCount || combinedReviews.length;
  
  // Auto-advance photo carousel
  useEffect(() => {
    if (combinedPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % combinedPhotos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [combinedPhotos.length]);
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % combinedPhotos.length);
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + combinedPhotos.length) % combinedPhotos.length);
  };
  
  const getCurrentHours = () => {
    if (!settings?.workingHours && !enrichedData?.openingHours) return null;
    
    const now = new Date();
    const currentDay = now.toLocaleLowerCase().slice(0, 3); // mon, tue, etc
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    if (enrichedData?.openingHours) {
      return {
        isOpen: enrichedData.openingHours.openNow,
        text: enrichedData.openingHours.openNow ? 'Abierto ahora' : 'Cerrado'
      };
    }
    
    // Fallback to local hours
    const dayNames = {
      'mon': 'monday',
      'tue': 'tuesday', 
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday',
      'sun': 'sunday'
    };
    
    const todayHours = settings?.workingHours?.[dayNames[currentDay]];
    if (!todayHours || !todayHours.enabled) {
      return { isOpen: false, text: 'Cerrado' };
    }
    
    const openTime = parseInt(todayHours.start.replace(':', ''));
    const closeTime = parseInt(todayHours.end.replace(':', ''));
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    return {
      isOpen,
      text: isOpen ? 'Abierto ahora' : 'Cerrado'
    };
  };
  
  const currentHours = getCurrentHours();

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200" 
          : "bg-transparent"
      )}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings?.profileImage ? (
                <img 
                  src={settings.profileImage} 
                  alt={business.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className={cn(
                  "font-bold transition-colors",
                  isScrolled ? "text-gray-900 text-lg" : "text-white text-xl drop-shadow-lg"
                )}>{business.name}</h1>
                {enrichedData?.googlePlaceId && (
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <span className={cn(
                      "text-xs font-medium",
                      isScrolled ? "text-blue-600" : "text-blue-200"
                    )}>Verificado en Google</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {settings?.publicPhone && (
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 shadow-lg"
                  onClick={() => window.open(`tel:${settings.publicPhone}`, '_self')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Llamar
                </Button>
              )}
              {settings?.enablePublicBooking && (
                <Button 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700 shadow-lg"
                  onClick={() => setShowBookingWidget(!showBookingWidget)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Reservar
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Hero Section */}
      <section ref={heroRef} className="relative h-[70vh] overflow-hidden">
        {/* Background Image Carousel */}
        <div className="absolute inset-0">
          {combinedPhotos.length > 0 ? (
            <div className="relative w-full h-full">
              <img
                src={combinedPhotos[currentPhotoIndex]?.url || settings?.coverImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&h=1080"}
                alt="Hero"
                className="w-full h-full object-cover transition-all duration-1000"
              />
              {combinedPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-all"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-all"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                  
                  {/* Photo indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {combinedPhotos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          index === currentPhotoIndex ? "bg-white" : "bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-500 via-red-600 to-red-700" />
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Business Name & Category */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
                  {business.name}
                </h1>
                {settings?.professionalTitle && (
                  <p className="text-xl md:text-2xl text-white/90 drop-shadow">
                    {settings.professionalTitle}
                  </p>
                )}
                
                <div className="flex items-center justify-center space-x-4">
                  {categoryInfo && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-lg">
                      {categoryInfo.name}
                    </Badge>
                  )}
                  
                  {currentHours && (
                    <Badge className={cn(
                      "px-4 py-2 text-lg backdrop-blur-sm",
                      currentHours.isOpen 
                        ? "bg-green-500/20 text-green-100 border-green-300/30" 
                        : "bg-red-500/20 text-red-100 border-red-300/30"
                    )}>
                      <Clock className="w-4 h-4 mr-2" />
                      {currentHours.text}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rating & Reviews */}
              {businessRating > 0 && (
                <div className="flex items-center justify-center space-x-4 text-white">
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-6 h-6",
                            i < businessRating ? "fill-yellow-400 text-yellow-400" : "text-white/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-2xl font-bold drop-shadow">
                      {businessRating.toFixed(1)}
                    </span>
                    <span className="text-white/90 drop-shadow">
                      ({businessReviewCount} reseñas)
                    </span>
                  </div>
                  
                  {enrichedData?.googlePlaceId && (
                    <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                      <Shield className="w-5 h-5 text-blue-300" />
                      <span className="text-blue-100 font-medium">Verificado en Google</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {(settings?.publicDescription || business.description) && (
                <p className="text-lg md:text-xl text-white/90 drop-shadow max-w-2xl mx-auto leading-relaxed">
                  {settings?.publicDescription || business.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4 pt-4">
                {settings?.enablePublicBooking && (
                  <Button 
                    size="lg" 
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                    onClick={() => setShowBookingWidget(true)}
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    Reservar Cita Ahora
                  </Button>
                )}
                
                {settings?.publicPhone && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg backdrop-blur-sm shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
                    onClick={() => window.open(`tel:${settings.publicPhone}`, '_self')}
                  >
                    <Phone className="w-5 h-5 mr-3" />
                    Contactar
                  </Button>
                )}
              </div>
              
              {/* Quick Contact Info */}
              <div className="flex items-center justify-center space-x-8 text-white/80 pt-4">
                {(settings?.streetAddress || business.address) && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm">
                      {settings?.district || business.address?.split(',')[0] || 'Lima'}
                    </span>
                  </div>
                )}
                
                {settings?.publicPhone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-5 h-5" />
                    <span className="text-sm">{settings.publicPhone}</span>
                  </div>
                )}
                
                {enrichedData?.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <a 
                      href={enrichedData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm hover:text-white transition-colors"
                    >
                      Sitio Web
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

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

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}