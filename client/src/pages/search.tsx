import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Filter, SlidersHorizontal } from "lucide-react";
import PublicHeader from "@/components/public-header";
import BusinessCard from "@/components/business-card";
import { BUSINESS_CATEGORIES, PERUVIAN_CITIES } from "@/lib/constants";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Parse URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setSearchQuery(urlParams.get("q") || "");
    setSelectedCategory(urlParams.get("category") || "");
    setSelectedCity(urlParams.get("location") || "");
  }, [location]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: [
      "/api/search", 
      searchQuery,
      selectedCategory,
      selectedCity
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedCity) params.append("city", selectedCity);
      
      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      console.log('Frontend received search data:', data);
      return data;
    },
    enabled: true, // Always enabled for broader search
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0 // Don't cache results
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedCity) params.append("city", selectedCity);
    
    setLocation(`/buscar?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCity("");
    setLocation("/buscar");
  };

  const handleBusinessView = (customUrl: string) => {
    setLocation(`/${customUrl}`);
  };

  const registeredBusinesses = searchResults?.filter((b: any) => b.type === "registered") || [];
  const publicBusinesses = searchResults?.filter((b: any) => b.type === "public") || [];
  const googlePlacesResults = searchResults?.filter((b: any) => b.type === "google") || [];
  
  console.log('Frontend filtered results:', {
    total: searchResults?.length || 0,
    registered: registeredBusinesses.length,
    public: publicBusinesses.length,
    google: googlePlacesResults.length
  });
  


  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Main Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex items-center bg-gray-50 rounded-lg px-4 py-3">
                <Search className="text-gray-400 mr-3 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="¿Qué servicio necesitas?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <div className="flex items-center bg-gray-50 rounded-lg px-4 py-3 lg:w-64">
                <MapPin className="text-gray-400 mr-3 w-5 h-5" />
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERUVIAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 px-8 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 w-4 h-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <SlidersHorizontal className="mr-2 w-4 h-4" />
                Filtros
              </Button>

              {selectedCategory && (
                <Badge variant="secondary" className="px-3 py-1">
                  {BUSINESS_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => setSelectedCategory("")}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {(searchQuery || selectedCategory || selectedCity) && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las categorías</SelectItem>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Buscando negocios...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Registered Businesses */}
            {registeredBusinesses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Negocios Registrados ({registeredBusinesses.length})
                  </h2>
                  <Badge className="bg-red-600">
                    Con Reservas Online
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {registeredBusinesses.map((business: any) => (
                    <BusinessCard
                      key={`registered-${business.id}`}
                      business={business}
                      onViewClick={() => handleBusinessView(business.customUrl || business.slug)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Google Places Results */}
            {googlePlacesResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Resultados de Google Places ({googlePlacesResults.length})
                  </h2>
                  <Badge className="bg-blue-600 text-white">
                    Google Places
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {googlePlacesResults.map((business: any) => (
                    <div key={`google-${business.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                      {/* Business Image */}
                      <div className="relative h-48 bg-gray-200">
                        {business.photoUrl ? (
                          <img 
                            src={business.photoUrl} 
                            alt={business.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center ${business.photoUrl ? 'hidden' : ''}`}>
                          <div className="text-white text-center">
                            <div className="text-2xl font-bold mb-1">{business.name.charAt(0)}</div>
                            <div className="text-xs opacity-75">No Photo</div>
                          </div>
                        </div>
                        
                        {/* Rating Badge */}
                        {business.rating > 0 && (
                          <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center">
                            <span className="text-yellow-400 mr-1">★</span>
                            {business.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      
                      {/* Business Details */}
                      <div className="p-4">
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                            {business.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {business.address}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {business.category}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {business.rating > 0 && (
                              <div className="flex items-center text-yellow-500">
                                <span className="text-sm">★</span>
                                <span className="text-sm text-gray-600 ml-1">
                                  {business.rating.toFixed(1)} ({business.reviewCount})
                                </span>
                              </div>
                            )}
                            {business.priceLevel > 0 && (
                              <div className="text-sm text-gray-600">
                                {'$'.repeat(business.priceLevel)}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${business.id}`, '_blank')}
                            className="text-xs"
                          >
                            Ver en Maps
                          </Button>
                        </div>
                        
                        {/* Business Hours if available */}
                        {business.openNow !== undefined && (
                          <div className="mt-3 text-xs">
                            <span className={`px-2 py-1 rounded ${business.openNow ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {business.openNow ? 'Abierto ahora' : 'Cerrado'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public Directory */}
            {publicBusinesses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Directorio Público ({publicBusinesses.length})
                  </h2>
                  <Badge variant="outline">
                    Información Básica
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicBusinesses.map((business: any) => (
                    <BusinessCard
                      key={`public-${business.id}`}
                      business={business}
                      onViewClick={handleBusinessView}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults && searchResults.length === 0 && (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-600 mb-6">
                  Intenta modificar tu búsqueda o explorar diferentes categorías
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Ver Todos los Negocios
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
