import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, Filter, SlidersHorizontal, Star, Clock, DollarSign, ChevronLeft, ChevronRight, ArrowUpDown, Map, List } from "lucide-react";
import PublicHeader from "@/components/public-header";
import BusinessCard from "@/components/business-card";
import SimpleMap from "@/components/simple-map";
import { BUSINESS_CATEGORIES, PERUVIAN_CITIES, CITY_DISTRICTS } from "@/lib/constants";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  
  // Get available districts for selected city
  const availableDistricts = selectedCity && CITY_DISTRICTS[selectedCity] ? CITY_DISTRICTS[selectedCity] : [];
  
  // Reset district when city changes
  useEffect(() => {
    if (selectedCity && !CITY_DISTRICTS[selectedCity]) {
      setSelectedDistrict("all");
    } else if (selectedDistrict !== "all" && selectedCity && CITY_DISTRICTS[selectedCity]) {
      // Check if current district is valid for selected city
      if (!CITY_DISTRICTS[selectedCity].includes(selectedDistrict)) {
        setSelectedDistrict("all");
      }
    }
  }, [selectedCity, selectedDistrict]);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(4);
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [debouncedMapBounds, setDebouncedMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [mapFilterEnabled, setMapFilterEnabled] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredResults, setFilteredResults] = useState([]);
  const resultsPerPage = 20;

  // Parse URL parameters and force re-render
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newQuery = urlParams.get("q") || "";
    const newCategory = urlParams.get("category") || "";
    const newCity = urlParams.get("location") || urlParams.get("city") || "";
    const newDistrict = urlParams.get("district") || "all";
    const newMinRating = parseInt(urlParams.get("minRating") || "0");
    const newSortBy = urlParams.get("sort") || "relevance";
    
    console.log('URL params changed:', { query: newQuery, category: newCategory, city: newCity, district: newDistrict });
    
    setSearchQuery(newQuery);
    setSelectedCategory(newCategory || "all");
    setSelectedCity(newCity);
    setSelectedDistrict(newDistrict);
    setMinRating(newMinRating);
    setSortBy(newSortBy);
    setCurrentPage(1); // Reset pagination when filters change
  }, [location]);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: [
      "/api/search", 
      searchQuery,
      selectedCategory,
      selectedCity,
      selectedDistrict,
      minRating,
      openNow,
      sortBy,
      mapFilterEnabled ? debouncedMapBounds?.toString() : null,
      currentPage
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedDistrict) params.append("district", selectedDistrict);
      if (minRating > 0) params.append("minRating", minRating.toString());
      if (openNow) params.append("openNow", "true");
      if (sortBy !== "relevance") params.append("sort", sortBy);
      params.append("page", currentPage.toString());
      
      // Add map bounds if map filter is enabled and we have debounced bounds
      if (mapFilterEnabled && debouncedMapBounds) {
        const boundsData = {
          north: debouncedMapBounds.getNorthEast().lat(),
          south: debouncedMapBounds.getSouthWest().lat(),
          east: debouncedMapBounds.getNorthEast().lng(),
          west: debouncedMapBounds.getSouthWest().lng()
        };
        params.append("bounds", JSON.stringify(boundsData));
        
        // When using map filter, ignore city parameter to avoid conflicts
        params.delete("city");
      }
      
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      return data.results || data; // Handle both old and new response formats
    },
    enabled: !mapFilterEnabled || !!debouncedMapBounds,
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity === "all" ? "" : newCity);
    // Reset district when city changes
    setSelectedDistrict("all");
  };

  // Debounce map bounds changes to avoid constant API calls
  useEffect(() => {
    if (!mapFilterEnabled) {
      setDebouncedMapBounds(null);
      return;
    }
    
    const timeout = setTimeout(() => {
      setDebouncedMapBounds(mapBounds);
    }, 1500); // 1.5 second delay after map stops moving

    return () => clearTimeout(timeout);
  }, [mapBounds, mapFilterEnabled]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedDistrict && selectedDistrict !== "all") params.append("district", selectedDistrict);
    if (minRating > 0) params.append("minRating", minRating.toString());
    if (openNow) params.append("openNow", "true");
    if (sortBy !== "relevance") params.append("sort", sortBy);
    
    setLocation(`/buscar?${params.toString()}`);
  };
  
  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedDistrict("all");
    setMinRating(0);
    setMaxPrice(4);
    setOpenNow(false);
    setSortBy("relevance");
    
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCity) params.append("city", selectedCity);
    
    setLocation(`/buscar?${params.toString()}`);
  };

  // Force search when URL params exist but no search has been performed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasParams = urlParams.get("q") || urlParams.get("category") || urlParams.get("city");
    
    if (hasParams && !searchResults) {
      console.log('URL has search params but no results, triggering search...');
      refetch();
    }
  }, [searchResults, refetch]);

  // Map bounds filtering
  const isBusinessInMapBounds = (business: any) => {
    if (!mapBounds || !business.location?.lat || !business.location?.lng) {
      return true; // Show all if no bounds or location
    }
    
    const position = new google.maps.LatLng(business.location.lat, business.location.lng);
    return mapBounds.contains(position);
  };

  // Client-side filtering and sorting
  useEffect(() => {
    if (!searchResults) {
      setFilteredResults([]);
      return;
    }
    
    let filtered = [...searchResults];
    
    // Apply map bounds filter if enabled
    if (mapFilterEnabled && mapBounds) {
      filtered = filtered.filter(isBusinessInMapBounds);
    }
    
    // Apply client-side filters
    if (minRating > 0) {
      filtered = filtered.filter(business => (business.rating || 0) >= minRating);
    }
    
    if (maxPrice < 4) {
      filtered = filtered.filter(business => 
        !business.priceLevel || business.priceLevel <= maxPrice
      );
    }
    
    if (selectedDistrict && selectedDistrict !== "all") {
      filtered = filtered.filter(business => {
        if (business.address) {
          const address = business.address.toLowerCase();
          const district = selectedDistrict.toLowerCase();
          
          // Direct district name match
          if (address.includes(district)) {
            return true;
          }
          
          // Handle common district abbreviations and variations
          const districtMappings = {
            'comas': ['comas'],
            'san juan de miraflores': ['san juan', 'sjm'],
            'san juan de lurigancho': ['san juan', 'sjl', 's.j.l'],
            'villa el salvador': ['villa el salvador', 'ves'],
            'villa maría del triunfo': ['villa maría', 'vmt'],
            'san martín de porres': ['san martín', 'smp'],
            'los olivos': ['los olivos'],
            'independencia': ['independencia'],
            'santa anita': ['santa anita'],
            'el agustino': ['el agustino'],
            'la victoria': ['la victoria'],
            'san luis': ['san luis'],
            'jesús maría': ['jesús maría', 'jesus maria'],
            'pueblo libre': ['pueblo libre'],
            'magdalena': ['magdalena'],
            'san miguel': ['san miguel'],
            'cercado de lima': ['cercado', 'lima 15001'],
            'miraflores': ['miraflores'],
            'san isidro': ['san isidro'],
            'barranco': ['barranco'],
            'surco': ['surco', 'santiago de surco'],
            'la molina': ['la molina'],
            'san borja': ['san borja'],
            'lince': ['lince'],
            'breña': ['breña', 'brena'],
            'rímac': ['rímac', 'rimac'],
            'ate': ['ate'],
            'chorrillos': ['chorrillos'],
            'callao': ['callao']
          };
          
          const variations = districtMappings[district] || [district];
          return variations.some(variation => address.includes(variation));
        }
        return false;
      });
    }
    
    if (openNow) {
      filtered = filtered.filter(business => {
        // For Google Places results
        if (business.openNow !== undefined) {
          return business.openNow;
        }
        // For local businesses, we'd need to check working hours against current time
        return true; // Simplified for now
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "reviews":
          return (b.reviewCount || b.user_ratings_total || 0) - (a.reviewCount || a.user_ratings_total || 0);
        case "price_low":
          return (a.priceLevel || 0) - (b.priceLevel || 0);
        case "price_high":
          return (b.priceLevel || 0) - (a.priceLevel || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default: // relevance
          // Keep original order (Google API returns by relevance)
          return 0;
      }
    });
    
    setFilteredResults(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchResults, minRating, maxPrice, selectedDistrict, openNow, sortBy, mapBounds, mapFilterEnabled]);

  const handleBusinessView = (customUrl: string) => {
    setLocation(`/${customUrl}`);
  };

  // Separate filtered results by type for better organization
  const registeredBusinesses = filteredResults.filter((b: any) => b.type === "registered") || [];
  const publicBusinesses = filteredResults.filter((b: any) => b.type === "public") || [];
  const googlePlacesResults = filteredResults.filter((b: any) => b.type === "google") || [];
  
  // Pagination logic
  const totalResults = filteredResults.length;
  const totalPages = Math.ceil(totalResults / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  
  // Create a combined array for pagination
  const allResults = [...registeredBusinesses, ...publicBusinesses, ...googlePlacesResults];
  const paginatedResults = allResults.slice(startIndex, endIndex);
  
  console.log('Frontend filtered results:', {
    total: totalResults,
    filtered: filteredResults.length,
    registered: registeredBusinesses.length,
    public: publicBusinesses.length,
    google: googlePlacesResults.length,
    currentPage,
    totalPages,
    showing: paginatedResults.length
  });
  
  // Debug: Log the actual data to see what we're getting
  console.log('Raw search results data:', searchResults);
  console.log('Registered businesses:', registeredBusinesses);
  console.log('Public businesses:', publicBusinesses);
  console.log('Google places:', googlePlacesResults);
  


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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center bg-gray-50 rounded-lg px-4 py-3 lg:w-64">
                <MapPin className="text-gray-400 mr-3 w-5 h-5" />
                <Select value={selectedCity || "all"} onValueChange={handleCityChange}>
                  <SelectTrigger className="border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ciudades</SelectItem>
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

              {(searchQuery || (selectedCategory && selectedCategory !== "all") || selectedCity || (selectedDistrict && selectedDistrict !== "all") || minRating > 0 || openNow || sortBy !== "relevance") && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  Limpiar filtros
                </Button>
              )}
              
              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="flex items-center space-x-1"
                >
                  <List className="w-4 h-4" />
                  <span>Lista</span>
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className="flex items-center space-x-1"
                >
                  <Map className="w-4 h-4" />
                  <span>Mapa</span>
                </Button>
              </div>

              {/* Map Filter Toggle */}
              {viewMode === "map" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mapFilter"
                    checked={mapFilterEnabled}
                    onCheckedChange={setMapFilterEnabled}
                  />
                  <label htmlFor="mapFilter" className="text-sm text-gray-600">
                    Buscar en esta área del mapa
                  </label>
                </div>
              )}

              {/* Results count and sorting */}
              {totalResults > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <span>{totalResults} resultados encontrados</span>
                  {mapFilterEnabled && debouncedMapBounds && (
                    <span className="ml-2 text-blue-600">• Filtrado por área del mapa</span>
                  )}
                  {mapFilterEnabled && !debouncedMapBounds && (
                    <span className="ml-2 text-orange-600">• Mueve el mapa para buscar en el área</span>
                  )}
                  {currentPage > 1 && (
                    <span className="ml-2">• Página {currentPage} de {totalPages}</span>
                  )}
                </div>
              )}
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría
                      </label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          {BUSINESS_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* District Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distrito
                      </label>
                      <Select 
                        value={selectedDistrict} 
                        onValueChange={setSelectedDistrict}
                        disabled={!selectedCity || availableDistricts.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCity 
                              ? "Selecciona una ciudad primero" 
                              : availableDistricts.length === 0 
                                ? "No hay distritos disponibles"
                                : "Todos los distritos"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los distritos</SelectItem>
                          {availableDistricts.length > 0 && (
                            <div className="px-2 py-1 text-xs text-gray-500 border-b mb-1">
                              ⚠️ Filtro limitado: Google Places no siempre especifica distritos
                            </div>
                          )}
                          {availableDistricts.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Star className="w-4 h-4 inline mr-1" />
                        Calificación mínima
                      </label>
                      <Select value={minRating.toString()} onValueChange={(value) => setMinRating(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Cualquier calificación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Cualquier calificación</SelectItem>
                          <SelectItem value="4">4+ estrellas</SelectItem>
                          <SelectItem value="3">3+ estrellas</SelectItem>
                          <SelectItem value="2">2+ estrellas</SelectItem>
                          <SelectItem value="1">1+ estrellas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <ArrowUpDown className="w-4 h-4 inline mr-1" />
                        Ordenar por
                      </label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevancia</SelectItem>
                          <SelectItem value="rating">Mejor calificados</SelectItem>
                          <SelectItem value="reviews">Más reseñas</SelectItem>
                          <SelectItem value="name">Nombre A-Z</SelectItem>
                          <SelectItem value="price_low">Precio: menor a mayor</SelectItem>
                          <SelectItem value="price_high">Precio: mayor a menor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Level Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Nivel de precios (máximo)
                      </label>
                      <div className="space-y-2">
                        <Slider
                          value={[maxPrice]}
                          onValueChange={(value) => setMaxPrice(value[0])}
                          max={4}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>$</span>
                          <span>$$</span>
                          <span>$$$</span>
                          <span>$$$$</span>
                        </div>
                        <div className="text-center text-sm font-medium">
                          {maxPrice < 4 ? '$'.repeat(maxPrice) + ' o menos' : 'Cualquier precio'}
                        </div>
                      </div>
                    </div>

                    {/* Open Now Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Disponibilidad
                      </label>
                      <div className="flex items-center space-x-2 mt-3">
                        <Checkbox
                          id="openNow"
                          checked={openNow}
                          onCheckedChange={setOpenNow}
                        />
                        <label htmlFor="openNow" className="text-sm font-medium">
                          Abierto ahora
                        </label>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="w-full"
                      >
                        Limpiar filtros
                      </Button>
                    </div>

                    {/* Apply Filters Button */}
                    <div className="flex items-end">
                      <Button 
                        onClick={handleSearch}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Aplicar filtros
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        ) : viewMode === "map" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            {/* Business List Sidebar */}
            <div className="order-1 lg:order-1 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">
                  {filteredResults.length} negocios encontrados
                </h3>
                
                {filteredResults.length > 0 ? (
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                    {filteredResults.map((business: any) => (
                      <div
                        key={business.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedBusiness?.id === business.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedBusiness(business)}
                      >
                        <h4 className="font-medium text-sm">{business.name}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {business.address}
                        </p>
                        {business.rating && (
                          <div className="flex items-center mt-2">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs ml-1">{business.rating}</span>
                            {business.reviewCount && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({business.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                        {business.phone && (
                          <p className="text-xs text-blue-600 mt-1">{business.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No hay resultados en esta área</h3>
                    <p className="mt-2">Intenta mover o hacer zoom en el mapa</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Map Container */}
            <div className="order-2 lg:order-2" style={{ height: '600px' }}>
              <SimpleMap
                businesses={filteredResults}
                onMapBoundsChange={mapFilterEnabled ? (bounds) => setMapBounds(bounds) : undefined}
                onBusinessClick={(business) => setSelectedBusiness(business)}
                selectedBusiness={selectedBusiness}
                className="h-full w-full"
              />
            </div>
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
