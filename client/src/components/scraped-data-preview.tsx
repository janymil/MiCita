import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock,
  Image,
  MessageSquare,
  Facebook,
  Instagram,
  Search,
  ExternalLink,
  Download,
  Check,
  X,
  AlertTriangle
} from "lucide-react";

interface ScrapedDataPreviewProps {
  data: any;
  onApprove: () => void;
  onReject: () => void;
  isApplying?: boolean;
}

export function ScrapedDataPreview({ data, onApprove, onReject, isApplying }: ScrapedDataPreviewProps) {
  if (!data) return null;

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'facebook': return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'google': return <Search className="h-4 w-4 text-green-600" />;
      default: return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Quality Score */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">
              📊 Datos Extraídos Automáticamente
            </CardTitle>
            <Badge 
              variant="secondary" 
              className={`px-3 py-1 font-semibold ${getQualityColor(data.qualityScore || 0)}`}
            >
              {data.qualityScore || 0}% Completo
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Revisa los datos extraídos antes de aplicarlos a tu micrositio
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre del Negocio</label>
              <p className="font-semibold">{data.name || 'No encontrado'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descripción</label>
              <p className="text-sm leading-relaxed">
                {data.description || 'No encontrada'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Categoría</label>
              <p>{data.category || 'No especificada'}</p>
            </div>

            {data.rating && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="font-semibold">{data.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({data.reviewCount || 0} reseñas)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{data.phone}</span>
              </div>
            )}

            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{data.email}</span>
              </div>
            )}

            {data.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={data.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {data.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {data.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <span className="text-sm">{data.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images Gallery */}
        {data.galleryImages && data.galleryImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-purple-600" />
                Galería de Imágenes ({data.galleryImages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="grid grid-cols-3 gap-2">
                  {data.galleryImages.slice(0, 12).map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-md transition-all" />
                    </div>
                  ))}
                </div>
                {data.galleryImages.length > 12 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    +{data.galleryImages.length - 12} imágenes más
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {data.reviews && data.reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Reseñas ({data.reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {data.reviews.slice(0, 5).map((review: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{review.author}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating 
                                    ? 'text-yellow-500 fill-current' 
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {getSourceIcon(review.source || 'google')}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.comment || 'Sin comentario'}
                      </p>
                    </div>
                  ))}
                </div>
                {data.reviews.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    +{data.reviews.length - 5} reseñas más
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Social Media */}
        {data.socialMedia && Object.keys(data.socialMedia).some(key => data.socialMedia[key]) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-600" />
                Redes Sociales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.socialMedia.facebook && (
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  <a 
                    href={data.socialMedia.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Facebook
                  </a>
                </div>
              )}
              
              {data.socialMedia.instagram && (
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <a 
                    href={data.socialMedia.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:underline text-sm"
                  >
                    Instagram
                  </a>
                </div>
              )}

              {data.socialMedia.youtube && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-red-600" />
                  <a 
                    href={data.socialMedia.youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-red-600 hover:underline text-sm"
                  >
                    YouTube
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Business Hours */}
        {data.hours && Object.keys(data.hours).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Horarios de Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.hours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{day}</span>
                    <span className="text-muted-foreground">
                      {hours.closed ? 'Cerrado' : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-muted-foreground">
                Los datos se aplicarán automáticamente a tu micrositio
              </span>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={onReject}
                disabled={isApplying}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Rechazar
              </Button>
              
              <Button 
                onClick={onApprove}
                disabled={isApplying}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isApplying ? (
                  <>
                    <Download className="h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Aplicar Datos
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}