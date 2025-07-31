import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Sparkles,
  Wand2,
  TrendingUp,
  Users,
  Star,
  Image as ImageIcon,
  Globe,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Edit,
  Plus,
  Download,
  Upload,
  BarChart3,
  Calendar
} from 'lucide-react';

interface ModernBusinessDashboardProps {
  businessId: number;
  onLaunchSetup: () => void;
}

interface BusinessStats {
  completionScore: number;
  totalViews: number;
  totalBookings: number;
  avgRating: number;
  reviewCount: number;
  galleryCount: number;
  lastUpdated: string;
}

interface BusinessCompletionItem {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  category: 'basic' | 'content' | 'visual' | 'seo' | 'engagement';
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export default function ModernBusinessDashboard({ businessId, onLaunchSetup }: ModernBusinessDashboardProps) {
  const [stats, setStats] = useState<BusinessStats>({
    completionScore: 45,
    totalViews: 234,
    totalBookings: 12,
    avgRating: 4.2,
    reviewCount: 8,
    galleryCount: 3,
    lastUpdated: '2 días atrás'
  });

  const [completionItems, setCompletionItems] = useState<BusinessCompletionItem[]>([
    {
      id: 'basic-info',
      name: 'Información Básica',
      description: 'Nombre, descripción, categoría del negocio',
      completed: true,
      category: 'basic',
      priority: 'high'
    },
    {
      id: 'contact-info',
      name: 'Información de Contacto',
      description: 'Teléfono, email, dirección, sitio web',
      completed: false,
      category: 'basic',
      priority: 'high',
      action: 'Extraer de redes sociales'
    },
    {
      id: 'gallery-images',
      name: 'Galería de Imágenes',
      description: 'Fotos del negocio, productos o servicios',
      completed: false,
      category: 'visual',
      priority: 'high',
      action: 'Importar automáticamente'
    },
    {
      id: 'customer-reviews',
      name: 'Reseñas de Clientes',
      description: 'Testimonios y calificaciones',
      completed: false,
      category: 'engagement',
      priority: 'medium',
      action: 'Importar de Google Maps'
    },
    {
      id: 'business-hours',
      name: 'Horarios de Atención',
      description: 'Días y horas de funcionamiento',
      completed: false,
      category: 'basic',
      priority: 'medium',
      action: 'Configurar manualmente'
    },
    {
      id: 'services-list',
      name: 'Lista de Servicios',
      description: 'Servicios ofrecidos con precios',
      completed: false,
      category: 'content',
      priority: 'high',
      action: 'Generar con IA'
    },
    {
      id: 'seo-optimization',
      name: 'Optimización SEO',
      description: 'Meta títulos, descripciones, palabras clave',
      completed: false,
      category: 'seo',
      priority: 'medium',
      action: 'Optimizar con IA'
    },
    {
      id: 'social-media',
      name: 'Redes Sociales',
      description: 'Enlaces a Facebook, Instagram, YouTube',
      completed: false,
      category: 'engagement',
      priority: 'low',
      action: 'Conectar automáticamente'
    }
  ]);

  const { toast } = useToast();

  const categoryColors = {
    basic: 'bg-blue-100 text-blue-800',
    content: 'bg-green-100 text-green-800',
    visual: 'bg-purple-100 text-purple-800',
    seo: 'bg-orange-100 text-orange-800',
    engagement: 'bg-pink-100 text-pink-800'
  };

  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-gray-200 bg-gray-50'
  };

  const categoryIcons = {
    basic: Phone,
    content: Edit,
    visual: ImageIcon,
    seo: TrendingUp,
    engagement: Users
  };

  const completedItems = completionItems.filter(item => item.completed);
  const pendingItems = completionItems.filter(item => !item.completed);
  const completionPercentage = Math.round((completedItems.length / completionItems.length) * 100);

  const renderCompletionScore = () => (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Puntuación de Completitud
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-blue-600 mb-2">{completionPercentage}%</div>
          <Progress value={completionPercentage} className="w-full mb-2" />
          <p className="text-sm text-gray-600">
            {completedItems.length} de {completionItems.length} elementos completados
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.totalViews}</div>
            <div className="text-xs text-gray-600">Visualizaciones</div>
          </div>
          <div className="p-3 bg-white rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.totalBookings}</div>
            <div className="text-xs text-gray-600">Reservas</div>
          </div>
        </div>

        {completionPercentage < 80 && (
          <Button 
            onClick={onLaunchSetup}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Completar con Asistente IA
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const renderQuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calificación Promedio</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-2xl font-bold">{stats.avgRating}</span>
                <span className="text-sm text-gray-500">({stats.reviewCount} reseñas)</span>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Galería de Fotos</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-2xl font-bold">{stats.galleryCount}</span>
                <span className="text-sm text-gray-500">imágenes</span>
              </div>
            </div>
            <ImageIcon className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Última Actualización</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-lg font-bold">{stats.lastUpdated}</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompletionChecklist = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Lista de Completitud del Negocio
        </CardTitle>
        <p className="text-sm text-gray-600">
          Completa todos los elementos para maximizar la visibilidad de tu negocio
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">✅ Completado</h4>
              <div className="space-y-2">
                {completedItems.map((item) => {
                  const CategoryIcon = categoryIcons[item.category];
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-600">{item.description}</div>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">⏳ Pendiente</h4>
              <div className="space-y-2">
                {pendingItems.map((item) => {
                  const CategoryIcon = categoryIcons[item.category];
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${priorityColors[item.priority]}`}>
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-4 h-4 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            <Badge className={categoryColors[item.category]} variant="secondary">
                              {item.category}
                            </Badge>
                            <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                              {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                          {item.action && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">{item.action}</div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {pendingItems.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={onLaunchSetup}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Completar Todo Automáticamente
            </Button>
            <p className="text-xs text-center text-gray-500 mt-2">
              El asistente IA completará automáticamente todos los elementos pendientes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-600" />
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
            <Eye className="w-5 h-5 mb-1" />
            <span className="text-xs">Ver Micrositio</span>
          </Button>
          
          <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
            <Edit className="w-5 h-5 mb-1" />
            <span className="text-xs">Editar Contenido</span>
          </Button>
          
          <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
            <Download className="w-5 h-5 mb-1" />
            <span className="text-xs">Descargar Datos</span>
          </Button>
          
          <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs">Gestionar Citas</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Business Status */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel de Control del Negocio</h1>
              <p className="text-gray-600 mb-4">
                Gestiona y optimiza la presencia online de tu negocio con herramientas inteligentes
              </p>
              <div className="flex items-center gap-4">
                <Badge className="bg-green-100 text-green-800">
                  ✅ Negocio Activo
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  🤖 IA Disponible
                </Badge>
                <Badge className="bg-purple-100 text-purple-800">
                  📊 Analytics Activos
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <Button 
                onClick={onLaunchSetup}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Mejorar con IA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Score - Takes 1 column */}
        <div className="lg:col-span-1">
          {renderCompletionScore()}
        </div>

        {/* Completion Checklist - Takes 2 columns */}
        <div className="lg:col-span-2">
          {renderCompletionChecklist()}
        </div>
      </div>

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Recomendaciones Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Agregar más fotos aumentará tus reservas</div>
                <div className="text-xs text-gray-600">Los negocios con 10+ fotos reciben 40% más consultas</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Tus reseñas están mejorando</div>
                <div className="text-xs text-gray-600">Calificación promedio subió 0.3 puntos este mes</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Optimiza para búsquedas locales</div>
                <div className="text-xs text-gray-600">Completa tu información de contacto para aparecer en más búsquedas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}