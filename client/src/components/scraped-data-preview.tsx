import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Facebook, 
  Instagram, 
  MapPin, 
  Globe, 
  Check, 
  X, 
  Eye,
  Clock,
  Mail,
  Phone,
  MapPinned,
  Image as ImageIcon,
  Calendar
} from 'lucide-react';

interface ScrapedDataItem {
  field: string;
  value: any;
  source: 'facebook' | 'instagram' | 'googleMaps' | 'website';
  confidence: number;
  displayName: string;
  category: 'contact' | 'social' | 'brand' | 'gallery' | 'schedule' | 'basic';
}

interface ScrapedDataPreviewProps {
  scrapedData: {
    rawData: any;
    processedData: any;
    qualityScore: number;
    sources: string[];
  };
  onApplyData: (selectedData: ScrapedDataItem[]) => void;
  onCancel: () => void;
}

const sourceIcons = {
  facebook: Facebook,
  instagram: Instagram,
  googleMaps: MapPin,
  website: Globe
};

const sourceColors = {
  facebook: 'bg-blue-100 text-blue-800',
  instagram: 'bg-pink-100 text-pink-800', 
  googleMaps: 'bg-green-100 text-green-800',
  website: 'bg-gray-100 text-gray-800'
};

const categoryIcons = {
  contact: Phone,
  social: Facebook,
  brand: ImageIcon,
  gallery: ImageIcon,
  schedule: Clock,
  basic: Eye
};

export function ScrapedDataPreview({ scrapedData, onApplyData, onCancel }: ScrapedDataPreviewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Add null safety protection for scrapedData with all required properties
  const safeScrapedData = scrapedData || { 
    processedData: {}, 
    rawData: {}, 
    sources: [], 
    qualityScore: 0 
  };
  const processedData = safeScrapedData.processedData || {};
  const rawData = safeScrapedData.rawData || {};
  const sources = safeScrapedData.sources || [];
  const qualityScore = safeScrapedData.qualityScore || 0;
  
  // Transform processed data into structured preview format
  const dataItems: ScrapedDataItem[] = [
    // Basic Info
    ...(processedData.name ? [{
      field: 'professionalTitle',
      value: processedData.name,
      source: getSourceForField('name', rawData),
      confidence: 95,
      displayName: 'Nombre del Negocio',
      category: 'basic' as const
    }] : []),
    
    ...(processedData.description ? [{
      field: 'publicDescription', 
      value: processedData.description,
      source: getSourceForField('description', rawData),
      confidence: 85,
      displayName: 'Descripción',
      category: 'basic' as const
    }] : []),

    // Contact Info
    ...(processedData.phone ? [{
      field: 'publicPhone',
      value: processedData.phone,
      source: getSourceForField('phone', rawData),
      confidence: 90,
      displayName: 'Teléfono',
      category: 'contact' as const
    }] : []),

    ...(processedData.email ? [{
      field: 'publicEmail',
      value: processedData.email, 
      source: getSourceForField('email', rawData),
      confidence: 90,
      displayName: 'Email',
      category: 'contact' as const
    }] : []),

    ...(processedData.address ? [{
      field: 'streetAddress',
      value: processedData.address,
      source: getSourceForField('address', rawData),
      confidence: 95,
      displayName: 'Dirección',
      category: 'contact' as const
    }] : []),

    // Social Media
    ...(processedData.socialMedia?.facebook ? [{
      field: 'facebookUrl',
      value: processedData.socialMedia.facebook,
      source: 'facebook' as const,
      confidence: 100,
      displayName: 'Facebook URL',
      category: 'social' as const
    }] : []),

    ...(processedData.socialMedia?.instagram ? [{
      field: 'instagramUrl', 
      value: processedData.socialMedia.instagram,
      source: 'instagram' as const,
      confidence: 100,
      displayName: 'Instagram URL',
      category: 'social' as const
    }] : []),

    // Brand Assets
    ...(processedData.profileImage ? [{
      field: 'profileImage',
      value: processedData.profileImage,
      source: getSourceForField('profileImage', rawData),
      confidence: 80,
      displayName: 'Logo/Imagen de Perfil',
      category: 'brand' as const
    }] : []),

    ...(processedData.coverImage ? [{
      field: 'coverImage',
      value: processedData.coverImage,
      source: getSourceForField('coverImage', rawData), 
      confidence: 75,
      displayName: 'Imagen de Portada',
      category: 'brand' as const
    }] : []),

    // Gallery
    ...(processedData.galleryImages?.length > 0 ? [{
      field: 'galleryImages',
      value: processedData.galleryImages,
      source: getSourceForField('galleryImages', rawData),
      confidence: 70,
      displayName: `Galería (${processedData.galleryImages.length} imágenes)`,
      category: 'gallery' as const
    }] : []),

    // Schedule (if hours data exists)
    ...(processedData.hours ? [{
      field: 'workingHours',
      value: processedData.hours,
      source: getSourceForField('hours', rawData),
      confidence: 85,
      displayName: 'Horarios de Atención',
      category: 'schedule' as const
    }] : [])
  ];

  const groupedData = dataItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ScrapedDataItem[]>);

  const handleItemToggle = (field: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === dataItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(dataItems.map(item => item.field)));
    }
  };

  const handleApply = () => {
    const selectedData = dataItems.filter(item => selectedItems.has(item.field));
    onApplyData(selectedData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="w-6 h-6 mr-3 text-green-600" />
              🎉 ¡Datos Extraídos Exitosamente!
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              Calidad: {qualityScore}%
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Fuentes utilizadas:</span>
            {sources.map(source => (
              <Badge key={source} variant="outline" className="capitalize">
                {source}
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Data Preview Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📋 Revisar y Confirmar Datos</span>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
              >
                {selectedItems.size === dataItems.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </Button>
              <Badge variant="secondary">
                {selectedItems.size} de {dataItems.length} seleccionados
              </Badge>
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Revisa los datos extraídos y selecciona cuáles deseas aplicar a tu configuración
          </p>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="brand">Marca</TabsTrigger>
              <TabsTrigger value="gallery">Galería</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {Object.entries(groupedData).map(([category, items]) => (
                <DataCategorySection 
                  key={category}
                  category={category}
                  items={items}
                  selectedItems={selectedItems}
                  onItemToggle={handleItemToggle}
                />
              ))}
            </TabsContent>

            {Object.keys(groupedData).map(category => (
              <TabsContent key={category} value={category} className="space-y-4 mt-6">
                <DataCategorySection 
                  category={category}
                  items={groupedData[category] || []}
                  selectedItems={selectedItems}
                  onItemToggle={handleItemToggle}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button 
          onClick={handleApply}
          disabled={selectedItems.size === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-2" />
          Aplicar Datos Seleccionados ({selectedItems.size})
        </Button>
      </div>
    </div>
  );
}

function DataCategorySection({ 
  category, 
  items, 
  selectedItems, 
  onItemToggle 
}: {
  category: string;
  items: ScrapedDataItem[];
  selectedItems: Set<string>;
  onItemToggle: (field: string) => void;
}) {
  const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
  
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="flex items-center font-semibold text-gray-800 capitalize">
        <CategoryIcon className="w-4 h-4 mr-2" />
        {category === 'basic' ? 'Información Básica' :
         category === 'contact' ? 'Información de Contacto' :
         category === 'social' ? 'Redes Sociales' :
         category === 'brand' ? 'Recursos de Marca' :
         category === 'gallery' ? 'Galería de Imágenes' :
         category === 'schedule' ? 'Horarios' : category}
      </h3>
      
      <div className="space-y-2">
        {items.map((item) => (
          <DataItemCard 
            key={item.field}
            item={item}
            isSelected={selectedItems.has(item.field)}
            onToggle={() => onItemToggle(item.field)}
          />
        ))}
      </div>
    </div>
  );
}

function DataItemCard({ 
  item, 
  isSelected, 
  onToggle 
}: {
  item: ScrapedDataItem;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const SourceIcon = sourceIcons[item.source];
  
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-gray-900">{item.displayName}</span>
              <Badge className={sourceColors[item.source]}>
                <SourceIcon className="w-3 h-3 mr-1" />
                {item.source}
              </Badge>
              <Badge variant="secondary">
                {item.confidence}% confianza
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              {item.category === 'gallery' && Array.isArray(item.value) ? (
                <div className="flex space-x-2">
                  {item.value.slice(0, 3).map((url, index) => (
                    <img key={index} src={url} alt="" className="w-12 h-12 rounded object-cover" />
                  ))}
                  {item.value.length > 3 && (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs">
                      +{item.value.length - 3}
                    </div>
                  )}
                </div>
              ) : item.category === 'brand' && typeof item.value === 'string' && item.value.startsWith('http') ? (
                <img src={item.value} alt="" className="w-16 h-16 rounded object-cover" />
              ) : item.category === 'schedule' ? (
                <div className="text-xs">
                  {Object.entries(item.value || {}).slice(0, 2).map(([day, hours]: [string, any]) => (
                    <div key={day}>
                      {day}: {hours.enabled ? `${hours.start} - ${hours.end}` : 'Cerrado'}
                    </div>
                  ))}
                  {Object.keys(item.value || {}).length > 2 && <div>...</div>}
                </div>
              ) : (
                <span className="break-words">{String(item.value)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine which source provided a specific field
function getSourceForField(field: string, rawData: any): 'facebook' | 'instagram' | 'googleMaps' | 'website' {
  // Add null safety protection
  if (!rawData || typeof rawData !== 'object') return 'website';
  
  if (rawData.facebook && hasFieldValue(rawData.facebook, field)) return 'facebook';
  if (rawData.instagram && hasFieldValue(rawData.instagram, field)) return 'instagram';
  if (rawData.googleMaps && hasFieldValue(rawData.googleMaps, field)) return 'googleMaps';
  return 'website';
}

function hasFieldValue(sourceData: any, field: string): boolean {
  if (!sourceData) return false;
  const value = sourceData[field];
  return value !== null && value !== undefined && value !== '';
}
