import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  Facebook, 
  Instagram, 
  MapPin, 
  Search, 
  Sparkles,
  Eye,
  Star,
  Phone,
  Mail,
  Globe,
  MapPin as LocationIcon,
  Image as ImageIcon,
  Users,
  Wand2,
  Save,
  ExternalLink,
  Download
} from 'lucide-react';

interface BusinessSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  onSuccess: () => void;
}

interface DataSource {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  placeholder: string;
  enabled: boolean;
  url?: string;
  searchQuery?: string;
  status: 'idle' | 'scraping' | 'completed' | 'error';
  data?: any;
  progress: number;
}

interface ExtractedData {
  basic: {
    name?: string;
    description?: string;
    category?: string;
    rating?: number;
    reviewCount?: number;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  media: {
    profileImage?: string;
    coverImage?: string;
    galleryImages: string[];
  };
  reviews: Array<{
    author: string;
    rating: number;
    comment: string;
  }>;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  hours?: string[];
}

interface GeneratedMicrositio {
  hero: {
    title: string;
    tagline: string;
    callToAction: string;
  };
  about: {
    content: string;
  };
  services: Array<{
    name: string;
    description: string;
  }>;
  whyChooseUs: Array<{
    title: string;
    description: string;
  }>;
  seo: {
    title: string;
    metaDescription: string;
    keywords: string;
  };
}

const WORKFLOW_STEPS = [
  { id: 'sources', name: 'Fuentes de Datos', description: 'Configura enlaces de redes sociales' },
  { id: 'extraction', name: 'Extracción', description: 'Procesamos la información' },
  { id: 'review', name: 'Revisión', description: 'Verifica los datos extraídos' },
  { id: 'micrositio', name: 'Micrositio', description: 'Genera página con IA' },
  { id: 'preview', name: 'Vista Previa', description: 'Revisa antes de aplicar' },
  { id: 'complete', name: 'Completado', description: 'Negocio configurado' }
];

export default function BusinessSetupWizard({ isOpen, onClose, businessId, onSuccess }: BusinessSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'google-maps',
      name: 'Google Maps',
      icon: MapPin,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Información completa del negocio, fotos y reseñas',
      placeholder: 'https://maps.google.com/...',
      enabled: false,
      status: 'idle',
      progress: 0
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Página de Facebook del negocio',
      placeholder: 'https://facebook.com/tu-negocio',
      enabled: false,
      status: 'idle',
      progress: 0
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: 'Perfil de Instagram con contenido visual',
      placeholder: 'https://instagram.com/tu-negocio',
      enabled: false,
      status: 'idle',
      progress: 0
    },
    {
      id: 'kagi-search',
      name: 'Búsqueda Web',
      icon: Search,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Búsqueda adicional en internet',
      placeholder: 'nombre del negocio lima perú',
      enabled: false,
      status: 'idle',
      progress: 0
    }
  ]);

  const [extractedData, setExtractedData] = useState<ExtractedData>({
    basic: {},
    contact: {},
    media: { galleryImages: [] },
    reviews: [],
    socialMedia: {},
    hours: []
  });

  const [generatedMicrositio, setGeneratedMicrositio] = useState<GeneratedMicrositio | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleSourceToggle = (sourceId: string, enabled: boolean) => {
    setDataSources(prev => prev.map(source => 
      source.id === sourceId ? { ...source, enabled } : source
    ));
  };

  const handleSourceInput = (sourceId: string, value: string) => {
    setDataSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        if (source.id === 'kagi-search') {
          return { ...source, searchQuery: value };
        } else {
          return { ...source, url: value };
        }
      }
      return source;
    }));
  };

  const startExtraction = async () => {
    setCurrentStep(1);
    setIsProcessing(true);

    const enabledSources = dataSources.filter(source => source.enabled);
    
    for (const source of enabledSources) {
      // Update status to scraping
      setDataSources(prev => prev.map(s => 
        s.id === source.id ? { ...s, status: 'scraping', progress: 0 } : s
      ));

      try {
        // Start scraping
        const payload = {
          source: source.id,
          businessId,
          ...(source.id === 'kagi-search' 
            ? { kagiSearchQuery: source.searchQuery }
            : { [source.id + 'Url']: source.url }
          )
        };

        const response = await fetch('/api/scraping/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
            'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          
          // Poll for results
          const pollForResults = async (runId: string) => {
            const maxAttempts = 30;
            let attempts = 0;

            const poll = async () => {
              try {
                const statusResponse = await fetch(`/api/scraping/status/${runId}`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
                    'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
                  }
                });

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  
                  // Update progress
                  setDataSources(prev => prev.map(s => 
                    s.id === source.id 
                      ? { ...s, progress: Math.min(statusData.progress || 0, 90) }
                      : s
                  ));

                  if (statusData.status === 'SUCCEEDED' && statusData.data) {
                    // Mark as completed
                    setDataSources(prev => prev.map(s => 
                      s.id === source.id 
                        ? { ...s, status: 'completed', progress: 100, data: statusData.data }
                        : s
                    ));

                    // Merge extracted data
                    mergeExtractedData(statusData.data);
                    return;
                  }

                  if (statusData.status === 'FAILED') {
                    setDataSources(prev => prev.map(s => 
                      s.id === source.id 
                        ? { ...s, status: 'error', progress: 0 }
                        : s
                    ));
                    return;
                  }

                  // Continue polling
                  attempts++;
                  if (attempts < maxAttempts) {
                    setTimeout(poll, 2000);
                  }
                }
              } catch (error) {
                console.error('Error polling:', error);
              }
            };

            await poll();
          };

          await pollForResults(result.runId);
        } else {
          setDataSources(prev => prev.map(s => 
            s.id === source.id ? { ...s, status: 'error' } : s
          ));
        }

      } catch (error) {
        console.error(`Error extracting from ${source.name}:`, error);
        setDataSources(prev => prev.map(s => 
          s.id === source.id ? { ...s, status: 'error' } : s
        ));
      }
    }

    // Check if all sources are done
    const allCompleted = enabledSources.every(source => {
      const currentSource = dataSources.find(s => s.id === source.id);
      return currentSource?.status === 'completed' || currentSource?.status === 'error';
    });

    if (allCompleted) {
      setIsProcessing(false);
      setCurrentStep(2);
    }
  };

  const mergeExtractedData = (newData: any) => {
    setExtractedData(prev => ({
      basic: {
        ...prev.basic,
        name: newData.name || prev.basic.name,
        description: newData.description || prev.basic.description,
        category: newData.category || prev.basic.category,
        rating: newData.rating || prev.basic.rating,
        reviewCount: newData.reviewCount || prev.basic.reviewCount
      },
      contact: {
        ...prev.contact,
        phone: newData.phone || prev.contact.phone,
        email: newData.email || prev.contact.email,
        website: newData.website || prev.contact.website,
        address: newData.address || prev.contact.address
      },
      media: {
        profileImage: newData.profileImage || prev.media.profileImage,
        coverImage: newData.coverImage || prev.media.coverImage,
        galleryImages: [
          ...prev.media.galleryImages,
          ...(newData.galleryImages || [])
        ].slice(0, 20) // Limit to 20 images
      },
      reviews: [
        ...prev.reviews,
        ...(newData.reviews || [])
      ].slice(0, 10), // Limit to 10 reviews
      socialMedia: {
        ...prev.socialMedia,
        facebook: newData.socialMedia?.facebook || prev.socialMedia.facebook,
        instagram: newData.socialMedia?.instagram || prev.socialMedia.instagram,
        youtube: newData.socialMedia?.youtube || prev.socialMedia.youtube
      },
      hours: newData.hours || prev.hours
    }));
  };

  const generateMicrositio = async () => {
    setCurrentStep(3);
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/incremental-scraping/generate-micrositio/${businessId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedMicrositio(result.micrositioStructure);
        setCurrentStep(4);
        
        toast({
          title: "Micrositio generado",
          description: "Contenido creado con IA basado en tus datos",
        });
      } else {
        throw new Error('Error generando micrositio');
      }
    } catch (error) {
      console.error('Error generating micrositio:', error);
      toast({
        title: "Error",
        description: "Error al generar el micrositio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyEverything = async () => {
    setCurrentStep(5);
    setIsProcessing(true);

    try {
      // Apply extracted data
      for (const source of dataSources.filter(s => s.enabled && s.data)) {
        await fetch('/api/incremental-scraping/apply-incremental', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
            'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
          },
          body: JSON.stringify({
            businessId,
            scrapedData: source.data,
            source: source.id
          })
        });
      }

      // Apply micrositio structure if generated
      if (generatedMicrositio) {
        const settingsUpdate = {
          publicTitle: generatedMicrositio.hero.title,
          publicDescription: generatedMicrositio.hero.tagline,
          aboutDescription: generatedMicrositio.about.content,
          metaTitle: generatedMicrositio.seo.title,
          metaDescription: generatedMicrositio.seo.metaDescription,
          keywords: generatedMicrositio.seo.keywords
        };

        await fetch(`/api/dashboard/businesses/${businessId}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
            'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
          },
          body: JSON.stringify(settingsUpdate)
        });
      }

      toast({
        title: "¡Configuración completada!",
        description: "Tu negocio ha sido configurado exitosamente",
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error applying configuration:', error);
      toast({
        title: "Error",
        description: "Error al aplicar la configuración",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {WORKFLOW_STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
            ${index <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {index < currentStep ? <CheckCircle className="w-5 h-5" /> : index + 1}
          </div>
          <div className="ml-3 hidden md:block">
            <div className={`text-sm font-medium ${index <= currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
              {step.name}
            </div>
            <div className="text-xs text-gray-400">{step.description}</div>
          </div>
          {index < WORKFLOW_STEPS.length - 1 && (
            <ArrowRight className="w-4 h-4 mx-4 text-gray-400" />
          )}
        </div>
      ))}
    </div>
  );

  const renderSourcesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Configurar Fuentes de Datos</h3>
        <p className="text-gray-600">Agrega los enlaces de tus redes sociales y Google Maps para extraer información automáticamente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataSources.map((source) => {
          const Icon = source.icon;
          return (
            <Card key={source.id} className={`transition-all ${source.enabled ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className={`${source.bgColor} rounded-t-lg`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${source.color}`} />
                    {source.name}
                  </div>
                  <input
                    type="checkbox"
                    checked={source.enabled}
                    onChange={(e) => handleSourceToggle(source.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 mb-3">{source.description}</p>
                {source.enabled && (
                  <Input
                    placeholder={source.placeholder}
                    value={source.id === 'kagi-search' ? source.searchQuery || '' : source.url || ''}
                    onChange={(e) => handleSourceInput(source.id, e.target.value)}
                    className="text-sm"
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          onClick={startExtraction}
          disabled={!dataSources.some(s => s.enabled && (s.url || s.searchQuery))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Iniciar Extracción
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderExtractionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Extrayendo Datos</h3>
        <p className="text-gray-600">Procesando información de tus fuentes seleccionadas</p>
      </div>

      <div className="space-y-4">
        {dataSources.filter(s => s.enabled).map((source) => {
          const Icon = source.icon;
          return (
            <Card key={source.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${source.color}`} />
                    <span className="font-medium">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {source.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {source.status === 'error' && <X className="w-5 h-5 text-red-500" />}
                    {source.status === 'scraping' && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                    <Badge variant={
                      source.status === 'completed' ? 'default' :
                      source.status === 'error' ? 'destructive' :
                      source.status === 'scraping' ? 'secondary' : 'outline'
                    }>
                      {source.status === 'completed' ? 'Completado' :
                       source.status === 'error' ? 'Error' :
                       source.status === 'scraping' ? 'Procesando' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
                <Progress value={source.progress} className="w-full" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Datos Extraídos</h3>
        <p className="text-gray-600">Revisa la información recopilada antes de continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
        {/* Basic Information */}
        {(extractedData.basic.name || extractedData.basic.description) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {extractedData.basic.name && (
                <div>
                  <span className="font-medium">Nombre:</span> {extractedData.basic.name}
                </div>
              )}
              {extractedData.basic.rating && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Calificación:</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{extractedData.basic.rating}</span>
                    {extractedData.basic.reviewCount && (
                      <span className="text-gray-500">({extractedData.basic.reviewCount} reseñas)</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        {(extractedData.contact.phone || extractedData.contact.email || extractedData.contact.website) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {extractedData.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{extractedData.contact.phone}</span>
                </div>
              )}
              {extractedData.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{extractedData.contact.email}</span>
                </div>
              )}
              {extractedData.contact.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="truncate">{extractedData.contact.website}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gallery Images */}
        {extractedData.media.galleryImages.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Galería ({extractedData.media.galleryImages.length} imágenes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {extractedData.media.galleryImages.slice(0, 12).map((image, index) => (
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
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {extractedData.reviews.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Reseñas ({extractedData.reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {extractedData.reviews.slice(0, 3).map((review, index) => (
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button onClick={generateMicrositio} className="bg-purple-600 hover:bg-purple-700">
          <Wand2 className="w-4 h-4 mr-2" />
          Generar Micrositio con IA
        </Button>
      </div>
    </div>
  );

  const renderMicrositioStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        {isProcessing ? (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Generando Micrositio</h3>
            <p className="text-gray-600">La IA está creando contenido profesional para tu negocio</p>
          </>
        ) : (
          <>
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Micrositio Generado</h3>
            <p className="text-gray-600">Contenido creado con inteligencia artificial</p>
          </>
        )}
      </div>

      {generatedMicrositio && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa del Micrositio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg">{generatedMicrositio.hero.title}</h4>
              <p className="text-gray-600">{generatedMicrositio.hero.tagline}</p>
            </div>
            
            <Separator />
            
            <div>
              <h5 className="font-medium mb-2">Acerca de Nosotros</h5>
              <p className="text-sm text-gray-600">{generatedMicrositio.about.content}</p>
            </div>

            {generatedMicrositio.services.length > 0 && (
              <>
                <Separator />
                <div>
                  <h5 className="font-medium mb-2">Servicios ({generatedMicrositio.services.length})</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {generatedMicrositio.services.map((service, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-gray-600">{service.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!isProcessing && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => setCurrentStep(4)} className="bg-green-600 hover:bg-green-700">
            <Eye className="w-4 h-4 mr-2" />
            Vista Previa Final
          </Button>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Eye className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Vista Previa Final</h3>
        <p className="text-gray-600">Confirma todos los cambios antes de aplicar</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">Se aplicarán los siguientes cambios:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ Datos extraídos de {dataSources.filter(s => s.enabled && s.status === 'completed').length} fuentes</li>
          <li>✓ {extractedData.media.galleryImages.length} imágenes agregadas a la galería</li>
          <li>✓ {extractedData.reviews.length} reseñas importadas</li>
          {generatedMicrositio && <li>✓ Contenido de micrositio generado con IA</li>}
          <li>✓ Información de contacto actualizada</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(3)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button onClick={applyEverything} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Aplicar Configuración
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
      <h3 className="text-2xl font-bold text-green-600">¡Configuración Completada!</h3>
      <p className="text-gray-600">Tu negocio ha sido configurado exitosamente con todos los datos extraídos</p>
      
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={() => window.open(`/negocio/${businessId}`, '_blank')} className="bg-blue-600 hover:bg-blue-700">
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Micrositio
        </Button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Configuración Automática del Negocio</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepIndicator()}
          
          {currentStep === 0 && renderSourcesStep()}
          {currentStep === 1 && renderExtractionStep()}
          {currentStep === 2 && renderReviewStep()}
          {currentStep === 3 && renderMicrositioStep()}
          {currentStep === 4 && renderPreviewStep()}
          {currentStep === 5 && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
}