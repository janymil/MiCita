import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, MapPin, Star, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedBusinessCard from './enhanced-business-card';
import BusinessCardSkeleton from './business-card-skeleton';

interface RecommendationProps {
  userId?: string;
  userLocation?: { lat: number; lng: number };
  category?: string;
}

interface RecommendedBusiness {
  id: string;
  name: string;
  category: string;
  rating: number;
  distance?: number;
  reason: string;
  matchScore: number;
  // ... other business properties
}

export default function PersonalizedRecommendations({
  userId,
  userLocation,
  category
}: RecommendationProps) {
  const [recommendations, setRecommendations] = useState<RecommendedBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'nearby' | 'trending'>('foryou');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (currentLocation || activeTab !== 'nearby') {
      fetchRecommendations();
    }
  }, [userId, currentLocation, category, activeTab]);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('denied');
      setIsLoading(false);
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(permission.state as 'granted' | 'denied' | 'prompt');
      
      if (permission.state === 'granted') {
        getCurrentLocation();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationPermission('prompt');
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(location);
        setLocationPermission('granted');
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationPermission('denied');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const requestLocation = () => {
    setIsLoading(true);
    getCurrentLocation();
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to get personalized recommendations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Only show recommendations if we have user data or location
      const hasUserData = userId || currentLocation;
      const hasSearchHistory = localStorage.getItem('searchHistory');
      
      if (!hasUserData && !hasSearchHistory) {
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      // Simulate different recommendation logic based on active tab
      let mockRecommendations: RecommendedBusiness[] = [];
      
      if (activeTab === 'nearby' && currentLocation) {
        // Mock nearby recommendations - would use actual API with location
        mockRecommendations = [
          {
            id: '1',
            name: 'Spa Relax Center',
            category: category || 'belleza',
            rating: 4.6,
            distance: 0.3,
            reason: 'A solo 300m de tu ubicación',
            matchScore: 92,
          },
          {
            id: '2',
            name: 'Gimnasio PowerFit',
            category: 'fitness',
            rating: 4.5,
            distance: 0.7,
            reason: 'Cerca de ti',
            matchScore: 85,
          },
        ];
      } else if (activeTab === 'foryou') {
        // Mock personalized recommendations based on search history
        const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
        if (searchHistory.length > 0) {
          mockRecommendations = [
            {
              id: '3',
              name: 'Elite Beauty Salon',
              category: category || 'belleza',
              rating: 4.8,
              distance: 1.2,
              reason: 'Basado en tus búsquedas anteriores',
              matchScore: 95,
            },
          ];
        }
      } else if (activeTab === 'trending') {
        // Mock trending recommendations
        mockRecommendations = [
          {
            id: '4',
            name: 'Trendy Fitness Studio',
            category: 'fitness',
            rating: 4.7,
            distance: 1.5,
            reason: 'Muy popular esta semana',
            matchScore: 88,
          },
        ];
      }
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'foryou', label: 'Para Ti', icon: Sparkles },
    { id: 'nearby', label: 'Cerca de Ti', icon: MapPin },
    { id: 'trending', label: 'Tendencias', icon: Star },
  ];

  // Don't render if no recommendations and not loading
  if (!isLoading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-red-500" />
          Recomendaciones Personalizadas
        </h2>
        
        {/* Tab Selector */}
        <div className="flex items-center bg-white rounded-full p-1 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isDisabled = tab.id === 'nearby' && !currentLocation && locationPermission !== 'granted';
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                disabled={isDisabled}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isDisabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : activeTab === tab.id 
                      ? 'bg-red-500 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Permission Request */}
      {activeTab === 'nearby' && locationPermission !== 'granted' && (
        <div className="text-center py-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Permitir acceso a ubicación
            </h3>
            <p className="text-gray-600 mb-4">
              Para mostrarte recomendaciones cercanas, necesitamos acceso a tu ubicación.
            </p>
            <Button onClick={requestLocation} className="bg-red-600 hover:bg-red-700">
              <MapPin className="w-4 h-4 mr-2" />
              Permitir ubicación
            </Button>
          </div>
        </div>
      )}

      {/* No Location Available */}
      {activeTab === 'nearby' && locationPermission === 'denied' && (
        <div className="text-center py-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ubicación no disponible
            </h3>
            <p className="text-gray-600 mb-4">
              No podemos acceder a tu ubicación. Puedes habilitar la ubicación en la configuración de tu navegador.
            </p>
          </div>
        </div>
      )}

      {/* Recommendation Cards */}
      {(activeTab !== 'nearby' || currentLocation) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <BusinessCardSkeleton key={index} />
            ))
          ) : recommendations.length > 0 ? (
            recommendations.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                {/* Match Score Badge */}
                <div className="absolute -top-3 -right-3 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                  {business.matchScore}% Match
                </div>
                
                {/* Recommendation Reason */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm text-xs text-gray-700 px-3 py-1 rounded-full shadow-md">
                  {business.reason}
                </div>
                
                <EnhancedBusinessCard
                  business={business as any}
                  onBookClick={() => console.log('Book', business.id)}
                  onViewClick={() => console.log('View', business.id)}
                  onSaveClick={() => console.log('Save', business.id)}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No hay recomendaciones disponibles
                </h3>
                <p className="text-gray-600">
                  Realiza algunas búsquedas para que podamos personalizar tus recomendaciones.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View All Button */}
      {!isLoading && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <button className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors">
            <span>Ver todas las recomendaciones</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* AI Insights - Only show if we have recommendations */}
      {!isLoading && recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl"
        >
          <div className="flex items-start space-x-3">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                Insights Personalizados
              </h4>
              <p className="text-sm text-gray-600">
                {currentLocation 
                  ? `Basado en tu ubicación y actividad, te recomendamos explorar más servicios de ${category || 'belleza'} cerca de ti.`
                  : `Basado en tu actividad, te recomendamos explorar más servicios de ${category || 'belleza'} en horarios menos concurridos (10 AM - 2 PM).`
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}