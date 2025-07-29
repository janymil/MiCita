import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { ScrapedDataPreview } from "./scraped-data-preview";
import {
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Facebook,
  Instagram,
  MapPin,
  Brain,
  Rocket,
  Globe,
  Calendar,
  Users
} from "lucide-react";

interface AutoSetupTabProps {
  businessId: number;
  onDataFetched?: (data: any) => void;
}

interface ScrapingSources {
  facebookUrl?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
}

interface ScrapingStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error?: string;
}

export function AutoSetupTab({ businessId, onDataFetched }: AutoSetupTabProps) {
  const { toast } = useToast();
  const [sources, setSources] = useState<ScrapingSources>({});
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    status: 'idle',
    progress: 0,
    currentStep: ''
  });
  const [scrapedData, setScrapedData] = useState<any>(null);

  const validateGoogleMapsUrl = (url: string): boolean => {
    const patterns = [
      /maps\.google\.com/,
      /goo\.gl\/maps/,
      /maps\.app\.goo\.gl/,
      /google\.com\/maps/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const startScrapingMutation = useMutation({
    mutationFn: async (sources: ScrapingSources) => {
      const response = await fetch('/api/scraping/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          facebookUrl: sources.facebookUrl,
          instagramUrl: sources.instagramUrl,
          googleMapsUrl: sources.googleMapsUrl,
          websiteUrl: sources.websiteUrl
        })
      });

      if (!response.ok) {
        throw new Error('Error al iniciar el scraping');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setScrapingStatus({ status: 'running', progress: 0, currentStep: 'Iniciando...' });
      pollJobStatus(data.jobId);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar la auto-configuración",
        variant: "destructive"
      });
    }
  });

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scraping/status/${jobId}`);
        const status = await response.json();

        if (response.ok) {
          setScrapingStatus({
            status: status.status,
            progress: status.progress || 0,
            currentStep: status.currentStep || ''
          });

          if (status.status === 'completed') {
            clearInterval(interval);
            const resultsResponse = await fetch(`/api/scraping/results/${jobId}`);
            if (resultsResponse.ok) {
              const results = await resultsResponse.json();
              setScrapedData(results);
              onDataFetched?.(results);
              toast({
                title: "✅ Auto-configuración completada",
                description: "Tu micrositio se ha configurado automáticamente"
              });
            }
          } else if (status.status === 'failed') {
            clearInterval(interval);
            setScrapingStatus({ 
              status: 'failed', 
              progress: 0, 
              currentStep: '', 
              error: status.error || 'Error en el proceso' 
            });
            toast({
              title: "Error en la auto-configuración",
              description: status.error || "Hubo un problema durante el proceso",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        setScrapingStatus({ status: 'failed', progress: 0, currentStep: '', error: 'Error de conexión' });
        clearInterval(interval);
        toast({
          title: "Error de conexión",
          description: "No se pudo obtener el estado del proceso",
          variant: "destructive"
        });
      }
    }, 2000);
  };

  const handleStartScraping = () => {
    const hasAnySources = Object.values(sources).some(url => url && url.trim());
    if (!hasAnySources) {
      toast({
        title: "Fuentes requeridas",
        description: "Agrega al menos una fuente (Facebook, Instagram, Google Maps o sitio web)",
        variant: "destructive"
      });
      return;
    }

    if (sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl)) {
      toast({
        title: "URL inválida",
        description: "Por favor, ingresa una URL válida de Google Maps",
        variant: "destructive"
      });
      return;
    }

    startScrapingMutation.mutate(sources);
  };

  const handleStartOver = () => {
    setScrapedData(null);
    setScrapingStatus({ status: 'idle', progress: 0, currentStep: '' });
    setSources({});
  };

  const applyDataToSettings = (data: any) => {
    const formattedData: any = {};

    // Basic info
    if (data.name) formattedData.businessName = data.name;
    if (data.description) formattedData.publicDescription = data.description;
    if (data.phone) formattedData.publicPhone = data.phone;
    if (data.email) formattedData.publicEmail = data.email;

    // Address
    if (data.address) {
      formattedData.streetAddress = data.address;
      // Try to extract district/region from address
      const addressParts = data.address.split(',').map((part: string) => part.trim());
      if (addressParts.length > 1) {
        formattedData.district = addressParts[addressParts.length - 2];
        formattedData.region = addressParts[addressParts.length - 1];
      }
    }

    // Social media
    if (data.facebookUrl) formattedData.facebookUrl = data.facebookUrl;
    if (data.instagramUrl) formattedData.instagramUrl = data.instagramUrl;

    // Images
    if (data.profileImage) formattedData.profileImage = data.profileImage;
    if (data.coverImage) formattedData.coverImage = data.coverImage;
    if (data.galleryImages) formattedData.galleryImages = data.galleryImages;

    // Hours
    if (data.hours) {
      formattedData.workingHours = data.hours;
    }

    onDataFetched?.(formattedData);
  };

  if (scrapedData) {
    return <ScrapingResults data={scrapedData} onStartOver={handleStartOver} />;
  }

  if (scrapingStatus.status === 'running') {
    return <ScrapingProgress status={scrapingStatus} sources={sources} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-6 h-6 mr-3 text-purple-600" />
            🚀 Auto-Configuración Inteligente
          </CardTitle>
          <p className="text-gray-600">
            Deja que la IA configure automáticamente tu micrositio extrayendo información de tus redes sociales y presencia online.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sources Input */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Facebook */}
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center">
                  <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                  Facebook (Opcional)
                </Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/tu-negocio"
                  value={sources.facebookUrl || ''}
                  onChange={(e) => setSources(prev => ({ ...prev, facebookUrl: e.target.value }))}
                />
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center">
                  <Instagram className="w-4 h-4 mr-2 text-pink-600" />
                  Instagram (Opcional)
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/tu-negocio"
                  value={sources.instagramUrl || ''}
                  onChange={(e) => setSources(prev => ({ ...prev, instagramUrl: e.target.value }))}
                />
              </div>

              {/* Google Maps */}
              <div className="space-y-2">
                <Label htmlFor="googlemaps" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-red-600" />
                  Google Maps (Muy recomendado)
                </Label>
                <Input
                  id="googlemaps"
                  placeholder="https://maps.google.com/..."
                  value={sources.googleMapsUrl || ''}
                  onChange={(e) => setSources(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
                  className={sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl) ? 'border-red-500' : ''}
                />
                {sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl) && (
                  <p className="text-sm text-red-600">URL de Google Maps inválida</p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-green-600" />
                  Sitio Web (Opcional)
                </Label>
                <Input
                  id="website"
                  placeholder="https://tu-sitio-web.com"
                  value={sources.websiteUrl || ''}
                  onChange={(e) => setSources(prev => ({ ...prev, websiteUrl: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Brain className="w-5 h-5 mr-2 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">IA Avanzada</h4>
                </div>
                <p className="text-sm text-blue-700">
                  Extrae automáticamente información, imágenes y contenido relevante de tus fuentes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 mr-2 text-green-600" />
                  <h4 className="font-semibold text-green-800">Información Completa</h4>
                </div>
                <p className="text-sm text-green-700">
                  Horarios, ubicación, teléfono, descripción y más datos se configuran automáticamente.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center mb-2">
                  <Users className="w-5 h-5 mr-2 text-purple-600" />
                  <h4 className="font-semibold text-purple-800">Ahorra Tiempo</h4>
                </div>
                <p className="text-sm text-purple-700">
                  En lugar de configurar manualmente, deja que la IA haga el trabajo por ti.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleStartScraping}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
              disabled={startScrapingMutation.isPending || (!!sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl))}
            >
              {startScrapingMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  🚀 Iniciar Auto-Configuración
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-600">
            <p>💡 Agrega cualquier fuente de información - Facebook, Instagram, Google Maps o sitio web</p>
            <p className="text-xs text-gray-500 mt-1">
              ✨ <strong>Funciona con una sola fuente:</strong> Si tu negocio solo tiene Google Maps, ¡perfecto! El sistema funciona igual de bien.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ScrapingProgress({ status, sources }: { status: ScrapingStatus; sources?: ScrapingSources }) {
  // Dynamic progress steps based on actual sources provided
  const allSteps = [
    { key: 'facebook', label: 'Extrayendo datos de Facebook', icon: Facebook, condition: !!sources?.facebookUrl },
    { key: 'instagram', label: 'Analizando Instagram', icon: Instagram, condition: !!sources?.instagramUrl },
    { key: 'google', label: 'Buscando en Google Maps', icon: MapPin, condition: !!sources?.googleMapsUrl },
    { key: 'processing', label: 'Procesando información', icon: Brain, condition: true },
    { key: 'enhancing', label: 'Mejorando contenido con IA', icon: Sparkles, condition: true },
    { key: 'generating', label: 'Generando micrositio', icon: Rocket, condition: true }
  ];

  // Filter steps based on provided sources
  const progressSteps = allSteps.filter(step => step.condition);
  const totalSteps = progressSteps.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">🤖 Creando tu micrositio automáticamente</h3>
        <p className="text-gray-600">
          {sources?.facebookUrl || sources?.instagramUrl || sources?.googleMapsUrl ? 
            `Procesando ${[sources.facebookUrl && 'Facebook', sources.instagramUrl && 'Instagram', sources.googleMapsUrl && 'Google Maps'].filter(Boolean).join(', ')}...` :
            'Esto tomará 2-3 minutos. Puedes cerrar esta ventana si deseas.'
          }
        </p>
      </div>
      
      <div className="space-y-4">
        {progressSteps.map((step, index) => {
          const stepProgress = Math.floor(status.progress / (100 / totalSteps));
          const isCompleted = index < stepProgress;
          const isActive = index === stepProgress;
          
          return (
            <div key={step.key} className="flex items-center p-3 rounded-lg border">
              <step.icon className={`w-5 h-5 mr-3 ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="font-medium">{step.label}</div>
                {isActive && (
                  <div className="text-sm text-blue-600">En progreso...</div>
                )}
                {isCompleted && (
                  <div className="text-sm text-green-600">✓ Completado</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-center">
          <div className="text-blue-800 font-medium">Progreso: {Math.round(status.progress)}%</div>
          <div className="text-blue-600 text-sm mt-1">{status.currentStep}</div>
        </div>
      </div>
    </div>
  );
}

function ScrapingResults({ data, onStartOver }: { data: any; onStartOver: () => void }) {
  return (
    <div className="space-y-6">
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <CheckCircle className="w-6 h-6 mr-3" />
            ¡Auto-configuración completada!
          </CardTitle>
          <p className="text-green-700">
            Tu micrositio se ha configurado automáticamente. Los datos se han aplicado a tu configuración.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Información encontrada:</strong>
              <ul className="mt-2 space-y-1">
                {data.name && <li>✓ Nombre del negocio</li>}
                {data.description && <li>✓ Descripción</li>}
                {data.phone && <li>✓ Teléfono</li>}
                {data.email && <li>✓ Email</li>}
                {data.address && <li>✓ Dirección</li>}
                {data.hours && <li>✓ Horarios</li>}
              </ul>
            </div>
            <div>
              <strong>Medios encontrados:</strong>
              <ul className="mt-2 space-y-1">
                {data.profileImage && <li>✓ Imagen de perfil</li>}
                {data.coverImage && <li>✓ Imagen de portada</li>}
                {data.galleryImages?.length > 0 && <li>✓ {data.galleryImages.length} imágenes de galería</li>}
                {data.reviews?.length > 0 && <li>✓ {data.reviews.length} reseñas</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center space-x-4">
        <Button onClick={onStartOver} variant="outline">
          Ejecutar nuevamente
        </Button>
        <Button onClick={() => window.open(`/${data.customUrl}`, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver micrositio
        </Button>
      </div>
    </div>
  );
}
