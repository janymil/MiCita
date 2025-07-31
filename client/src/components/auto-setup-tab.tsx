import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { ScrapedDataPreview } from "./scraped-data-preview";
import { 
  Sparkles, 
  Facebook, 
  Instagram, 
  MapPin, 
  Globe, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  Database,
  Zap,
  TrendingUp,
  Clock,
  Brain,
  Rocket,
  ExternalLink
} from "lucide-react";

interface AutoSetupTabProps {
  businessId: string | number;
  onDataFetched: (data: any) => void;
}

interface ScrapingSources {
  businessName?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  kagiSearchQuery?: string;
}

interface ScrapingStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'preview';
  progress: number;
  currentStep: string;
  data?: any;
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

  // Enhanced Google Maps URL validation - handles both simple and browser formats
  const validateGoogleMapsUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    
    const patterns = [
      /^https:\/\/(?:www\.)?google\.com\/maps\/place\//, // Browser format: /place/BusinessName/@coords/data=...
      /^https:\/\/(?:www\.)?google\.com\/maps\/@/,      // Direct coordinates: /@lat,lng,zoom
      /^https:\/\/maps\.google\.com\/maps\?/,           // Legacy format: ?q=search
      /^https:\/\/goo\.gl\/maps\//,                     // Shortened URL
      /^https:\/\/maps\.app\.goo\.gl\//                 // New shortened format
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const applyDataMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔄 Applying scraped data to micrositio...');
      
      // Apply data to business settings
      const response = await fetch(`/api/dashboard/businesses/${businessId}/apply-scraped-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to apply scraped data');
      }

      return response.json();
    },
    onSuccess: (result) => {
      console.log('✅ Data applied successfully:', result);
      toast({
        title: "Datos Aplicados",
        description: `Micrositio actualizado exitosamente con ${result.fieldsUpdated} campos.`,
        variant: "default"
      });
      
      // Notify parent component
      onDataFetched(result);
      
      // Reset to idle state
      setScrapingStatus({
        status: 'idle',
        progress: 0,
        currentStep: ''
      });
    },
    onError: (error) => {
      console.error('❌ Failed to apply data:', error);
      toast({
        title: "Error",
        description: "No se pudieron aplicar los datos automáticamente",
        variant: "destructive"
      });
    }
  });

  const startScrapingMutation = useMutation({
    mutationFn: async (sources: ScrapingSources) => {
      const response = await fetch('/api/scraping/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessId,
          businessName: sources.businessName || 'Mi Negocio',
          facebookUrl: sources.facebookUrl,
          instagramUrl: sources.instagramUrl,
          googleMapsUrl: sources.googleMapsUrl,
          websiteUrl: sources.websiteUrl,
          category: 'Negocio',
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start scraping');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🚀 Scraping started, job ID:', data.jobId);
      setScrapingStatus({ status: 'running', progress: 10, currentStep: 'Iniciando scrapers...' });
      // Start aggressive polling immediately
      pollScrapingStatus(data.jobId);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso de auto-configuración",
        variant: "destructive"
      });
    }
  });

  const pollScrapingStatus = async (jobId: string) => {
    console.log('🔄 Starting polling for job:', jobId);
    const maxAttempts = 120; // Poll for up to 4 minutes (every 2 seconds)
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        console.log(`📡 Polling attempt ${attempts}/${maxAttempts} for job:`, jobId);
        
        const response = await fetch(`/api/scraping/status/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 Status response:', result);
        
        if (!result.success) {
          throw new Error(result.message || 'Status check failed');
        }
        
        const statusData = result.data;
        
        // Update status based on actual job status
        if (statusData.status !== 'completed') {
          setScrapingStatus({
            status: 'running',
            progress: statusData.progress || 0,
            currentStep: statusData.currentStep || 'Procesando...'
          });
        }
        
        if (statusData.status === 'completed') {
          console.log('✅ Job completed, fetching results...');
          
          // Fetch final results immediately
          const resultsResponse = await fetch(`/api/scraping/results/${jobId}`);
          
          if (!resultsResponse.ok) {
            throw new Error(`Failed to fetch results: ${resultsResponse.status}`);
          }
          
          const resultsData = await resultsResponse.json();
          console.log('📊 Results fetched:', resultsData);
          
          if (resultsData.success && resultsData.data && resultsData.data.processedData) {
            console.log('✅ Setting preview data:', resultsData.data.processedData);
            setScrapingStatus({
              status: 'preview',
              progress: 100,
              currentStep: 'Datos listos para revisar',
              data: resultsData.data.processedData
            });
            
            toast({
              title: "¡Datos Extraídos!",
              description: `Se encontraron datos con ${resultsData.data.qualityScore}% completitud. Revisa y aplica.`,
              variant: "default"
            });
          } else {
            console.error('❌ Results structure invalid:', resultsData);
            throw new Error('No valid data structure in results');
          }
          
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Scraping job failed');
          
        } else if (statusData.status === 'running' && attempts < maxAttempts) {
          // Continue polling
          setTimeout(poll, 2000); // Poll every 2 seconds for faster updates
          
        } else if (attempts >= maxAttempts) {
          throw new Error('Timeout: Scraping is taking too long. Please try again.');
        }
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        setScrapingStatus({ status: 'idle', progress: 0, currentStep: '' });
        toast({
          title: "Error de Conexión",
          description: `Error al verificar el progreso: ${(error as Error).message}`,
          variant: "destructive"
        });
      }
    };
    
    // Start polling immediately
    poll();
  };

  const handleStartScraping = () => {
    if (!sources.facebookUrl && !sources.instagramUrl && !sources.googleMapsUrl && !sources.websiteUrl) {
      toast({
        title: "Información requerida",
        description: "Por favor ingresa al menos una fuente de información",
        variant: "destructive"
      });
      return;
    }

    if (sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl)) {
      toast({
        title: "Enlace inválido",
        description: "Por favor ingresa un enlace válido de Google Maps",
        variant: "destructive"
      });
      return;
    }

    startScrapingMutation.mutate(sources);
  };

  const handleStartOver = () => {
    setScrapingStatus({ status: 'idle', progress: 0, currentStep: '' });
    setSources({});
  };

  const handleApplyScrapedData = (selectedData: any[]) => {
    // Create a properly formatted data object for the parent component
    const formattedData: any = {};
    
    selectedData.forEach(item => {
      switch (item.field) {
        case 'professionalTitle':
          formattedData.name = item.value;
          break;
        case 'publicDescription':
          formattedData.description = item.value;
          break;
        case 'publicPhone':
          formattedData.phone = item.value;
          break;
        case 'publicEmail':
          formattedData.email = item.value;
          break;
        case 'streetAddress':
          formattedData.address = item.value;
          break;
        case 'profileImage':
          formattedData.profileImage = item.value;
          break;
        case 'coverImage':
          formattedData.coverImage = item.value;
          break;
        case 'facebookUrl':
          formattedData.facebookUrl = item.value;
          break;
        case 'instagramUrl':
          formattedData.instagramUrl = item.value;
          break;
        case 'galleryImages':
          formattedData.galleryImages = item.value;
          break;
        case 'workingHours':
          formattedData.hours = item.value;
          break;
      }
    });

    // Call the parent callback with formatted data
    onDataFetched(formattedData);
    
    toast({
      title: "¡Datos aplicados exitosamente!",
      description: `Se han aplicado ${selectedData.length} campos a tu configuración`,
      variant: "default"
    });

    setScrapingStatus({ status: 'completed', progress: 100, currentStep: 'Completado' });
  };

  const handleCancelPreview = () => {
    setScrapingStatus({ status: 'idle', progress: 0, currentStep: '' });
  };

  if (scrapingStatus.status === 'running') {
    return <ScrapingProgress status={scrapingStatus} sources={sources} />;
  }

  if (scrapingStatus.status === 'preview') {
    return (
      <ScrapedDataPreview 
        data={scrapingStatus.data || {}}
        onApprove={() => applyDataMutation.mutate(scrapingStatus.data)}
        onReject={handleCancelPreview}
        isApplying={applyDataMutation.isPending}
      />
    );
  }

  if (scrapingStatus.status === 'completed') {
    return <ScrapingResults data={scrapingStatus.data || {}} onStartOver={handleStartOver} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-purple-800">
            <Sparkles className="w-6 h-6 mr-3" />
            🤖 Auto-Configuración Inteligente
          </CardTitle>
          <p className="text-purple-700">
            Completa automáticamente tu micrositio extrayendo información de tus redes sociales y Google
          </p>
        </CardHeader>
      </Card>

      {/* Source Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Fuentes de Información
          </CardTitle>
          <p className="text-sm text-gray-600">
            Ingresa cualquier combinación de enlaces de tus redes sociales o Google Maps. No necesitas todos - con uno solo funciona perfectamente.
          </p>
          
          {/* Flexibility Info */}
          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Sistema Super Flexible 🎯</p>
                <div className="text-xs text-green-700 space-y-1">
                  <p>• Solo tienes Google Maps? ✅ Perfecto</p>
                  <p>• Solo Facebook o Instagram? ✅ También funciona</p>
                  <p>• Tienes todos? ✅ Aún mejor - más datos = mejor resultado</p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center font-semibold">
              <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
              Nombre del Negocio (opcional)
            </Label>
            <Input
              placeholder="Ej: Mi Restaurante, Mi Tienda, etc."
              value={sources.businessName || ''}
              onChange={(e) => setSources(prev => ({ ...prev, businessName: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si no lo ingresas, utilizaremos "Mi Negocio" como predeterminado
            </p>
          </div>

          <div>
            <Label className="flex items-center font-semibold">
              <Facebook className="w-4 h-4 mr-2 text-blue-600" />
              Facebook Business Page
            </Label>
            <Input
              placeholder="https://facebook.com/tu-negocio"
              value={sources.facebookUrl || ''}
              onChange={(e) => setSources(prev => ({ ...prev, facebookUrl: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center font-semibold">
              <Instagram className="w-4 h-4 mr-2 text-pink-600" />
              Instagram Business Profile
            </Label>
            <Input
              placeholder="https://instagram.com/tu-negocio"
              value={sources.instagramUrl || ''}
              onChange={(e) => setSources(prev => ({ ...prev, instagramUrl: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center font-semibold">
              <MapPin className="w-4 h-4 mr-2 text-blue-600" />
              Google Maps Link
            </Label>
            <Input
              placeholder="https://www.google.com/maps/place/..."
              value={sources.googleMapsUrl || ''}
              onChange={(e) => setSources(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
              className={`mt-1 ${sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl) 
                ? 'border-red-500 focus:border-red-500' 
                : ''
              }`}
            />
            {sources.googleMapsUrl && !validateGoogleMapsUrl(sources.googleMapsUrl) && (
              <p className="text-red-500 text-sm mt-1">
                Por favor, ingresa un enlace válido de Google Maps
              </p>
            )}
            <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-2">
                📋 Cómo obtener el enlace de Google Maps:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Ve a <strong>Google Maps</strong> en tu navegador</li>
                <li>Busca tu negocio y <strong>haz clic en él</strong></li>
                <li><strong>Copia la URL</strong> de la barra de direcciones</li>
                <li>Pégala aquí</li>
              </ol>
              <p className="text-xs text-blue-600 mt-2">
                💡 <strong>Súper fácil:</strong> Solo busca tu negocio, haz clic y copia la URL de arriba
              </p>
            </div>
          </div>

          <div>
            <Label className="flex items-center font-semibold">
              <Search className="w-4 h-4 mr-2 text-purple-600" />
              Búsqueda Inteligente Kagi (opcional)
            </Label>
            <Input
              placeholder="Búsqueda adicional: nombre del negocio, servicios, etc."
              value={sources.kagiSearchQuery || ''}
              onChange={(e) => setSources(prev => ({ ...prev, kagiSearchQuery: e.target.value }))}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Búsqueda adicional para encontrar más información sobre tu negocio
            </p>
          </div>

          <div>
            <Label className="flex items-center font-semibold">
              <Globe className="w-4 h-4 mr-2 text-gray-600" />
              Sitio Web (opcional)
            </Label>
            <Input
              placeholder="https://www.tu-sitio-web.com"
              value={sources.websiteUrl || ''}
              onChange={(e) => setSources(prev => ({ ...prev, websiteUrl: e.target.value }))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Button 
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
          // More accurate progress mapping based on backend phases:
          // 0-15%: Initial setup
          // 15-45%: Data scraping (distributed among source steps)
          // 45-70%: Data processing 
          // 70-90%: AI enhancement
          // 90-100%: Site generation
          
          let stepProgress = 0;
          let isCompleted = false;
          let isActive = false;
          
          // Count source steps (non-processing steps)
          const sourceSteps = progressSteps.filter(s => ['facebook', 'instagram', 'google'].includes(s.key));
          const sourceStepIndex = sourceSteps.findIndex(s => s.key === step.key);
          
          if (step.key === 'facebook' || step.key === 'instagram' || step.key === 'google') {
            // Source scraping steps (15-45% range)
            const sourceProgressPerStep = 30 / sourceSteps.length; // 30% divided among source steps
            const stepStartProgress = 15 + (sourceStepIndex * sourceProgressPerStep);
            const stepEndProgress = stepStartProgress + sourceProgressPerStep;
            
            isCompleted = status.progress > stepEndProgress;
            isActive = status.progress >= stepStartProgress && status.progress <= stepEndProgress;
          } else if (step.key === 'processing') {
            // Processing step (45-70%)
            isCompleted = status.progress > 70;
            isActive = status.progress >= 45 && status.progress <= 70;
          } else if (step.key === 'enhancing') {
            // AI enhancement step (70-90%)
            isCompleted = status.progress > 90;
            isActive = status.progress >= 70 && status.progress <= 90;
          } else if (step.key === 'generating') {
            // Site generation step (90-100%)
            isCompleted = status.progress >= 100;
            isActive = status.progress >= 90 && status.progress < 100;
          }
          
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
  // Add null/undefined protection for data
  const safeData = data || {};
  
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
                {safeData.name && <li>✓ Nombre del negocio</li>}
                {safeData.description && <li>✓ Descripción</li>}
                {safeData.phone && <li>✓ Teléfono</li>}
                {safeData.email && <li>✓ Email</li>}
                {safeData.address && <li>✓ Dirección</li>}
                {safeData.hours && <li>✓ Horarios</li>}
              </ul>
            </div>
            <div>
              <strong>Medios encontrados:</strong>
              <ul className="mt-2 space-y-1">
                {safeData.profileImage && <li>✓ Imagen de perfil</li>}
                {safeData.coverImage && <li>✓ Imagen de portada</li>}
                {safeData.galleryImages?.length > 0 && <li>✓ {safeData.galleryImages.length} imágenes de galería</li>}
                {safeData.reviews?.length > 0 && <li>✓ {safeData.reviews.length} reseñas</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center space-x-4">
        <Button onClick={onStartOver} variant="outline">
          Ejecutar nuevamente
        </Button>
        <Button onClick={() => window.open(`/${safeData.customUrl || ''}`, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver micrositio
        </Button>
      </div>
    </div>
  );
}
