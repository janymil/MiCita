import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Facebook, 
  Instagram, 
  MapPin, 
  Search, 
  Globe,
  Sparkles,
  Upload,
  Download,
  Eye,
  EyeOff,
  Star,
  Phone,
  Mail,
  Clock,
  Users,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface ScrapingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  onSuccess: () => void;
}

interface ScrapingSession {
  id: string;
  source: 'google-maps' | 'facebook' | 'instagram' | 'kagi-search';
  status: 'idle' | 'running' | 'completed' | 'error';
  url?: string;
  searchQuery?: string;
  data?: any;
  timestamp?: Date;
  progress: number;
}

interface ScrapedDataPreview {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  hours?: string[];
  galleryImages?: string[];
  profileImage?: string;
  coverImage?: string;
  reviews?: Array<{
    author: string;
    rating: number;
    comment: string;
  }>;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  source: string;
  qualityScore?: number;
}

export default function ScrapingModal({ isOpen, onClose, businessId, onSuccess }: ScrapingModalProps) {
  const [currentStep, setCurrentStep] = useState<'select' | 'configure' | 'scraping' | 'preview' | 'apply'>('select');
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [selectedSource, setSelectedSource] = useState<ScrapingSession['source'] | null>(null);
  const [scrapingData, setScrapingData] = useState<ScrapedDataPreview | null>(null);
  const [inputValues, setInputValues] = useState<{
    url?: string;
    searchQuery?: string;
  }>({});
  
  const { toast } = useToast();
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Source configurations
  const sourceConfigs = {
    'google-maps': {
      name: 'Google Maps',
      icon: MapPin,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Extrae información completa del negocio, fotos, reseñas y horarios',
      urlPlaceholder: 'https://maps.google.com/...',
      features: ['Información básica', 'Fotos del negocio', 'Reseñas de clientes', 'Horarios de atención']
    },
    'facebook': {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Obtén datos de tu página de Facebook Business',
      urlPlaceholder: 'https://facebook.com/tu-negocio',
      features: ['Información de página', 'Imágenes de perfil', 'Posts recientes', 'Datos de contacto']
    },
    'instagram': {
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: 'Extrae contenido visual y datos del perfil',
      urlPlaceholder: 'https://instagram.com/tu-negocio',
      features: ['Perfil del negocio', 'Galería de fotos', 'Stories destacados', 'Bio y contacto']
    },
    'kagi-search': {
      name: 'Búsqueda Web',
      icon: Search,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Busca información adicional en internet',
      urlPlaceholder: 'nombre del negocio lima perú',
      features: ['Información complementaria', 'Datos de contacto', 'Sitios web', 'Menciones online']
    }
  };

  const startScraping = async () => {
    if (!selectedSource || !businessId) return;
    
    setCurrentStep('scraping');
    
    const sessionId = Date.now().toString();
    const newSession: ScrapingSession = {
      id: sessionId,
      source: selectedSource,
      status: 'running',
      url: selectedSource !== 'kagi-search' ? inputValues.url : undefined,
      searchQuery: selectedSource === 'kagi-search' ? inputValues.searchQuery : undefined,
      progress: 0,
      timestamp: new Date()
    };
    
    setSessions(prev => [...prev, newSession]);
    
    try {
      const payload = {
        source: selectedSource,
        businessId,
        ...(selectedSource === 'kagi-search' 
          ? { kagiSearchQuery: inputValues.searchQuery }
          : { [selectedSource + 'Url']: inputValues.url }
        )
      };

      // Start scraping job
      const response = await fetch('/api/scraping/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error iniciando scraping');
      }

      const result = await response.json();
      
      // Start polling for results
      pollInterval.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/scraping/status/${result.runId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
              'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
            }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            setSessions(prev => prev.map(session => 
              session.id === sessionId 
                ? { ...session, progress: Math.min(statusData.progress || 0, 90) }
                : session
            ));

            if (statusData.status === 'SUCCEEDED' && statusData.data) {
              // Stop polling
              if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
              }

              // Update session and show results
              setSessions(prev => prev.map(session => 
                session.id === sessionId 
                  ? { ...session, status: 'completed', progress: 100, data: statusData.data }
                  : session
              ));

              setScrapingData({
                ...statusData.data,
                source: sourceConfigs[selectedSource].name
              });
              
              setCurrentStep('preview');
              
              toast({
                title: "¡Scraping completado!",
                description: `Datos extraídos exitosamente de ${sourceConfigs[selectedSource].name}`,
              });
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 2000);

    } catch (error) {
      console.error('Error starting scraping:', error);
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'error', progress: 0 }
          : session
      ));
      
      toast({
        title: "Error",
        description: "Error al iniciar el scraping",
        variant: "destructive"
      });
    }
  };

  const applyScrapedData = async () => {
    if (!scrapingData || !selectedSource) return;
    
    setCurrentStep('apply');
    
    try {
      const response = await fetch('/api/incremental-scraping/apply-incremental', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        },
        body: JSON.stringify({
          businessId,
          scrapedData,
          source: selectedSource
        })
      });

      if (!response.ok) {
        throw new Error('Error aplicando datos');
      }

      const result = await response.json();
      
      toast({
        title: "¡Datos aplicados exitosamente!",
        description: `Se aplicaron ${result.result.totalFields} campos incrementalmente`,
      });

      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error applying data:', error);
      toast({
        title: "Error",
        description: "Error al aplicar los datos extraídos",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    setSessions([]);
    setCurrentStep('select');
    setSelectedSource(null);
    setScrapingData(null);
    setInputValues({});
    onClose();
  };

  const addNewSource = () => {
    setCurrentStep('select');
    setSelectedSource(null);
    setInputValues({});
  };

  const renderSourceSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Selecciona una fuente de datos</h3>
        <p className="text-gray-600">Puedes extraer datos de múltiples fuentes y combinarlos</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(sourceConfigs).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Card 
              key={key}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedSource === key ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedSource(key as ScrapingSession['source'])}
            >
              <CardHeader className={`${config.bgColor} rounded-t-lg`}>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  {config.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                <div className="space-y-1">
                  {config.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedSource && (
        <Button 
          onClick={() => setCurrentStep('configure')}
          className="w-full mt-6"
          size="lg"
        >
          Continuar con {sourceConfigs[selectedSource].name}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );

  const renderConfiguration = () => {
    if (!selectedSource) return null;
    
    const config = sourceConfigs[selectedSource];
    const Icon = config.icon;
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${config.color}`} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Configurar {config.name}</h3>
          <p className="text-gray-600">{config.description}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label htmlFor="input-field">
                {selectedSource === 'kagi-search' ? 'Términos de búsqueda' : 'URL de la página'}
              </Label>
              <Input
                id="input-field"
                placeholder={config.urlPlaceholder}
                value={selectedSource === 'kagi-search' ? inputValues.searchQuery || '' : inputValues.url || ''}
                onChange={(e) => setInputValues(prev => ({
                  ...prev,
                  [selectedSource === 'kagi-search' ? 'searchQuery' : 'url']: e.target.value
                }))}
                className="text-base"
              />
              {selectedSource === 'kagi-search' && (
                <p className="text-sm text-gray-500">
                  Ejemplo: "Tu Negocio Lima Perú", "Barbería Centro de Lima"
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('select')}
            className="flex-1"
          >
            Atrás
          </Button>
          <Button 
            onClick={startScraping}
            disabled={selectedSource === 'kagi-search' ? !inputValues.searchQuery : !inputValues.url}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Extraer Datos
          </Button>
        </div>
      </div>
    );
  };

  const renderScrapingProgress = () => {
    const currentSession = sessions.find(s => s.source === selectedSource && s.status === 'running');
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Extrayendo datos...</h3>
          <p className="text-gray-600">Esto puede tomar unos momentos</p>
        </div>

        {currentSession && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{sourceConfigs[selectedSource!].name}</span>
                  <Badge variant="outline">{currentSession.progress}%</Badge>
                </div>
                <Progress value={currentSession.progress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Procesando información del negocio...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    if (!scrapingData) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">¡Datos extraídos!</h3>
          <p className="text-gray-600">Revisa los datos antes de aplicarlos</p>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Basic Information */}
          {(scrapingData.name || scrapingData.description) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scrapingData.name && (
                  <div className="flex justify-between">
                    <span className="font-medium">Nombre:</span>
                    <span>{scrapingData.name}</span>
                  </div>
                )}
                {scrapingData.description && (
                  <div>
                    <span className="font-medium">Descripción:</span>
                    <p className="text-sm text-gray-600 mt-1">{scrapingData.description}</p>
                  </div>
                )}
                {scrapingData.rating && (
                  <div className="flex justify-between">
                    <span className="font-medium">Calificación:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{scrapingData.rating}</span>
                      {scrapingData.reviewCount && (
                        <span className="text-gray-500">({scrapingData.reviewCount} reseñas)</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {(scrapingData.phone || scrapingData.email || scrapingData.website || scrapingData.address) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scrapingData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{scrapingData.phone}</span>
                  </div>
                )}
                {scrapingData.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{scrapingData.email}</span>
                  </div>
                )}
                {scrapingData.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span className="truncate">{scrapingData.website}</span>
                  </div>
                )}
                {scrapingData.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{scrapingData.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Images */}
          {scrapingData.galleryImages && scrapingData.galleryImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Imágenes ({scrapingData.galleryImages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {scrapingData.galleryImages.slice(0, 6).map((image, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                      <img 
                        src={image} 
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
                {scrapingData.galleryImages.length > 6 && (
                  <p className="text-sm text-gray-500 mt-2">
                    +{scrapingData.galleryImages.length - 6} imágenes más
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {scrapingData.reviews && scrapingData.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Reseñas ({scrapingData.reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scrapingData.reviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.author}</span>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={addNewSource}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Fuente
          </Button>
          <Button 
            onClick={applyScrapedData}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Aplicar Datos
          </Button>
        </div>
      </div>
    );
  };

  const renderApplying = () => (
    <div className="space-y-6 text-center">
      <Loader2 className="w-16 h-16 animate-spin text-green-500 mx-auto" />
      <h3 className="text-lg font-semibold">Aplicando datos...</h3>
      <p className="text-gray-600">Actualizando tu negocio con los datos extraídos</p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Extracción Inteligente de Datos
          </h2>
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className={`flex items-center gap-2 ${currentStep === 'select' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${currentStep === 'select' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              Seleccionar
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className={`flex items-center gap-2 ${currentStep === 'configure' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${currentStep === 'configure' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              Configurar
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className={`flex items-center gap-2 ${currentStep === 'scraping' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${currentStep === 'scraping' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              Extraer
            </div>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className={`flex items-center gap-2 ${currentStep === 'preview' || currentStep === 'apply' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${currentStep === 'preview' || currentStep === 'apply' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              Aplicar
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'select' && renderSourceSelection()}
          {currentStep === 'configure' && renderConfiguration()}
          {currentStep === 'scraping' && renderScrapingProgress()}
          {currentStep === 'preview' && renderPreview()}
          {currentStep === 'apply' && renderApplying()}
        </div>
      </div>
    </div>
  );
}