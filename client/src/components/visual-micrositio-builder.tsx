import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Wand2, 
  Eye, 
  Save, 
  RefreshCw, 
  Sparkles, 
  Palette, 
  Layout, 
  Image, 
  Type,
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  Facebook,
  Instagram,
  Youtube,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface VisualMicrositioBuilderProps {
  businessId: number;
  onClose: () => void;
}

interface MicrositioStructure {
  hero: {
    title: string;
    tagline: string;
    callToAction: string;
    backgroundImage?: string;
  };
  about: {
    title: string;
    content: string;
    description: string;
  };
  services: {
    title: string;
    list: Array<{
      name: string;
      description: string;
      icon: string;
    }>;
  };
  whyChooseUs: {
    title: string;
    reasons: Array<{
      title: string;
      description: string;
    }>;
  };
  contact: {
    title: string;
    phone?: string;
    website?: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      youtube?: string;
    };
  };
  gallery: {
    title: string;
    images: string[];
  };
  reviews: {
    title: string;
    rating?: number;
    reviewCount?: number;
    testimonials: Array<{
      author: string;
      rating: number;
      comment: string;
    }>;
  };
  seo: {
    title: string;
    metaDescription: string;
    keywords: string;
  };
}

interface Theme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  accentColor: string;
}

const THEMES: Theme[] = [
  {
    id: 'professional',
    name: 'Profesional',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    accentColor: '#f59e0b'
  },
  {
    id: 'modern',
    name: 'Moderno',
    primaryColor: '#7c3aed',
    secondaryColor: '#a855f7',
    textColor: '#374151',
    backgroundColor: '#f9fafb',
    accentColor: '#10b981'
  },
  {
    id: 'warm',
    name: 'Cálido',
    primaryColor: '#dc2626',
    secondaryColor: '#ef4444',
    textColor: '#1f2937',
    backgroundColor: '#fef2f2',
    accentColor: '#f59e0b'
  },
  {
    id: 'elegant',
    name: 'Elegante',
    primaryColor: '#1f2937',
    secondaryColor: '#374151',
    textColor: '#111827',
    backgroundColor: '#ffffff',
    accentColor: '#d97706'
  }
];

export default function VisualMicrositioBuilder({ businessId, onClose }: VisualMicrositioBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [structure, setStructure] = useState<MicrositioStructure | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const generateMicrositio = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch(`/api/incremental-scraping/generate-micrositio/${businessId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Error generando micrositio');
      }

      const result = await response.json();
      setStructure(result.micrositioStructure);
      
      toast({
        title: "¡Micrositio generado!",
        description: "Contenido creado con IA basado en los datos de tu negocio",
      });

    } catch (error) {
      console.error('Error generating micrositio:', error);
      toast({
        title: "Error",
        description: "Error al generar el micrositio. Verifica que tienes datos en tu negocio.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyMicrositio = async () => {
    if (!structure) return;
    
    setIsApplying(true);
    
    try {
      // Apply the generated structure to business settings
      const settingsUpdate = {
        publicTitle: structure.hero.title,
        publicDescription: structure.hero.tagline,
        aboutDescription: structure.about.content,
        servicesDescription: structure.services.title,
        metaTitle: structure.seo.title,
        metaDescription: structure.seo.metaDescription,
        keywords: structure.seo.keywords
      };

      const response = await fetch(`/api/dashboard/businesses/${businessId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('stack-access-token') || ''}`,
          'x-stack-access-token': localStorage.getItem('stack-access-token') || ''
        },
        body: JSON.stringify(settingsUpdate)
      });

      if (!response.ok) {
        throw new Error('Error aplicando micrositio');
      }

      toast({
        title: "¡Micrositio aplicado!",
        description: "Tu micrositio ha sido actualizado con el nuevo contenido",
      });

      onClose();

    } catch (error) {
      console.error('Error applying micrositio:', error);
      toast({
        title: "Error",
        description: "Error al aplicar el micrositio",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const renderStructureEditor = () => {
    if (!structure) return null;

    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Sección Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero-title">Título Principal</Label>
              <Input
                id="hero-title"
                value={structure.hero.title}
                onChange={(e) => setStructure({
                  ...structure,
                  hero: { ...structure.hero, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="hero-tagline">Eslogan</Label>
              <Input
                id="hero-tagline"
                value={structure.hero.tagline}
                onChange={(e) => setStructure({
                  ...structure,
                  hero: { ...structure.hero, tagline: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="hero-cta">Llamada a la Acción</Label>
              <Input
                id="hero-cta"
                value={structure.hero.callToAction}
                onChange={(e) => setStructure({
                  ...structure,
                  hero: { ...structure.hero, callToAction: e.target.value }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Acerca de Nosotros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="about-content">Descripción</Label>
              <Textarea
                id="about-content"
                value={structure.about.content}
                onChange={(e) => setStructure({
                  ...structure,
                  about: { ...structure.about, content: e.target.value }
                })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Services Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Servicios ({structure.services.list.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {structure.services.list.map((service, index) => (
                <div key={index} className="p-3 border rounded bg-gray-50">
                  <div className="font-medium text-sm">{service.name}</div>
                  <div className="text-xs text-gray-600">{service.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Why Choose Us */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Por qué Elegirnos ({structure.whyChooseUs.reasons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {structure.whyChooseUs.reasons.map((reason, index) => (
                <div key={index} className="p-3 border rounded bg-green-50">
                  <div className="font-medium text-sm">{reason.title}</div>
                  <div className="text-xs text-gray-600">{reason.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPreview = () => {
    if (!structure) return null;

    const theme = selectedTheme;

    return (
      <div className="max-w-4xl mx-auto">
        <div 
          className="min-h-screen"
          style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
        >
          {/* Hero Section */}
          <div 
            className="py-20 px-6 text-center"
            style={{ backgroundColor: theme.primaryColor, color: 'white' }}
          >
            <h1 className="text-4xl font-bold mb-4">{structure.hero.title}</h1>
            <p className="text-xl mb-8 opacity-90">{structure.hero.tagline}</p>
            <Button 
              size="lg"
              style={{ backgroundColor: theme.accentColor, color: 'white' }}
            >
              {structure.hero.callToAction}
            </Button>
          </div>

          {/* About Section */}
          <div className="py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: theme.primaryColor }}>
                {structure.about.title}
              </h2>
              <p className="text-lg leading-relaxed text-center">{structure.about.content}</p>
            </div>
          </div>

          {/* Services Section */}
          <div className="py-16 px-6" style={{ backgroundColor: theme.backgroundColor }}>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: theme.primaryColor }}>
                {structure.services.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {structure.services.list.map((service, index) => (
                  <div key={index} className="p-6 rounded-lg shadow-lg" style={{ backgroundColor: 'white' }}>
                    <div className="text-center">
                      <Star className="w-8 h-8 mx-auto mb-4" style={{ color: theme.accentColor }} />
                      <h3 className="font-semibold mb-2" style={{ color: theme.primaryColor }}>
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: theme.primaryColor }}>
                {structure.whyChooseUs.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {structure.whyChooseUs.reasons.map((reason, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <Check className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: theme.accentColor }} />
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: theme.primaryColor }}>
                        {reason.title}
                      </h3>
                      <p className="text-gray-600">{reason.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div 
            className="py-16 px-6"
            style={{ backgroundColor: theme.primaryColor, color: 'white' }}
          >
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-8">{structure.contact.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {structure.contact.phone && (
                  <div className="flex items-center justify-center space-x-2">
                    <Phone className="w-5 h-5" />
                    <span>{structure.contact.phone}</span>
                  </div>
                )}
                {structure.contact.address && (
                  <div className="flex items-center justify-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>{structure.contact.address}</span>
                  </div>
                )}
                {structure.contact.website && (
                  <div className="flex items-center justify-center space-x-2">
                    <Globe className="w-5 h-5" />
                    <span>{structure.contact.website}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-purple-500" />
            Constructor Visual de Micrositio
          </h2>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            {!structure && (
              <Button 
                onClick={generateMicrositio}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar con IA
                  </>
                )}
              </Button>
            )}
            
            {structure && (
              <>
                <Button
                  variant={isPreviewMode ? 'default' : 'outline'}
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {isPreviewMode ? 'Editar' : 'Vista Previa'}
                </Button>
                
                <Button
                  onClick={applyMicrositio}
                  disabled={isApplying}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Aplicar Micrositio
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Theme Selector */}
          {structure && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Tema:</Label>
              <div className="flex gap-2">
                {THEMES.map((theme) => (
                  <Button
                    key={theme.id}
                    variant={selectedTheme.id === theme.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTheme(theme)}
                    className="flex items-center gap-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    {theme.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!structure ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Wand2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Constructor de Micrositio con IA</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Genera automáticamente un micrositio profesional basado en los datos de tu negocio.
                  La IA creará contenido optimizado y estructura visual atractiva.
                </p>
                <Button 
                  onClick={generateMicrositio}
                  disabled={isGenerating}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generando Micrositio...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generar Micrositio con IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {isPreviewMode ? renderPreview() : (
                <div className="p-6">
                  {renderStructureEditor()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}