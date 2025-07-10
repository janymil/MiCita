import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MapPin, Filter, SlidersHorizontal, Star, Clock, DollarSign, ChevronLeft, ChevronRight, ArrowUpDown, Map, List, Phone, Globe, Mail } from "lucide-react";
import PublicHeader from "@/components/public-header";
import BusinessCard from "@/components/business-card";
import EnhancedBusinessCard from "@/components/enhanced-business-card";
import BusinessCardSkeleton from "@/components/business-card-skeleton";
import BusinessListItem from "@/components/business-list-item";
import ModernSearchBar from "@/components/modern-search-bar";
import PersonalizedRecommendations from "@/components/personalized-recommendations";
import OpenStreetMap from "@/components/openstreet-map";
import { BUSINESS_CATEGORIES, PERUVIAN_CITIES, CITY_DISTRICTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  
  // Get available districts for selected city
  const availableDistricts = selectedCity && CITY_DISTRICTS[selectedCity] ? CITY_DISTRICTS[selectedCity] : [];
  
  // Fetch subcategories for selected category with counts
  const { data: subcategoriesData = [] } = useQuery({
    queryKey: ["/api/subcategories", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory || selectedCategory === "all") return [];
      const response = await fetch(`/api/subcategories/${selectedCategory}?includeCounts=true`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: Boolean(selectedCategory && selectedCategory !== "all"),
  });

  // Use hardcoded categories
  const categories = BUSINESS_CATEGORIES;

  // Remove dynamic category counts
  
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
  
  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory("all");
  }, [selectedCategory]);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(4);
  const [openNow, setOpenNow] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [resultsPerPage, setResultsPerPage] = useState(12);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [mapBounds, setMapBounds] = useState<any | null>(null);
  const [debouncedMapBounds, setDebouncedMapBounds] = useState<any | null>(null);
  const [mapFilterEnabled, setMapFilterEnabled] = useState(false);
  const [isMapSearching, setIsMapSearching] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredResults, setFilteredResults] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    resultsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Clean pagination - no infinite scroll

  // Parse URL parameters and force re-render
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newQuery = urlParams.get("q") || "";
    const newCategory = urlParams.get("category") || "";
    const newSubcategory = urlParams.get("subcategory") || "all";
    const newCity = urlParams.get("location") || urlParams.get("city") || "";
    const newDistrict = urlParams.get("district") || "all";
    const newMinRating = parseInt(urlParams.get("minRating") || "0");
    const newSortBy = urlParams.get("sort") || "relevance";
    const newHasPhone = urlParams.get("hasPhone") === "true";
    const newHasWebsite = urlParams.get("hasWebsite") === "true";
    const newHasEmail = urlParams.get("hasEmail") === "true";
    
    console.log('URL params changed:', { query: newQuery, category: newCategory, city: newCity, district: newDistrict });
    
    setSearchQuery(newQuery);
    setSelectedCategory(newCategory || "all");
    setSelectedSubcategory(newSubcategory);
    setSelectedCity(newCity);
    setSelectedDistrict(newDistrict);
    setMinRating(newMinRating);
    setSortBy(newSortBy);
    setHasPhone(newHasPhone);
    setHasWebsite(newHasWebsite);
    setHasEmail(newHasEmail);
    setCurrentPage(1); // Reset pagination when filters change
  }, [location]);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: [
      "/api/search", 
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      selectedCity,
      selectedDistrict,
      minRating,
      openNow,
      hasPhone,
      hasWebsite,
      hasEmail,
      sortBy,
      mapFilterEnabled ? debouncedMapBounds?.toString() : null,
      currentPage,
      resultsPerPage,
      viewMode // Add viewMode to trigger refetch when switching to map view
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedSubcategory && selectedSubcategory !== "all") params.append("subcategory", selectedSubcategory);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedDistrict) params.append("district", selectedDistrict);
      if (minRating > 0) params.append("minRating", minRating.toString());
      if (openNow) params.append("openNow", "true");
      if (hasPhone) params.append("hasPhone", "true");
      if (hasWebsite) params.append("hasWebsite", "true");
      if (hasEmail) params.append("hasEmail", "true");
      if (sortBy !== "relevance") params.append("sort", sortBy);
      params.append("page", currentPage.toString());
      // Use higher limit for map view to show all businesses on map
      params.append("limit", viewMode === "map" ? "2000" : resultsPerPage.toString());
      
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
      
      // Store pagination info for the component
      if (data.pagination) {
        setPaginationInfo(data.pagination);
      }
      
      // Use server-side pagination data directly
      return data; // Return the complete response with pagination info
    },
    enabled: Boolean(!mapFilterEnabled || !!debouncedMapBounds),
    staleTime: 5000,
    cacheTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onSuccess: () => {
      // Clear map searching state when data loads
      setIsMapSearching(false);
    }
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
      setIsMapSearching(false);
      return;
    }
    
    // Show searching indicator when bounds change
    if (mapBounds && mapBounds !== debouncedMapBounds) {
      setIsMapSearching(true);
    }
    
    const timeout = setTimeout(() => {
      setDebouncedMapBounds(mapBounds);
    }, 800); // 0.8 second delay after map stops moving

    return () => clearTimeout(timeout);
  }, [mapBounds, mapFilterEnabled]);

  // Clear search indicator when search completes
  useEffect(() => {
    if (!isLoading && isMapSearching) {
      setIsMapSearching(false);
    }
  }, [isLoading, isMapSearching]);

  const handleSearch = () => {
    // Save search to history for recommendations
    if (searchQuery || selectedCategory !== "all") {
      const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const searchTerm = {
        query: searchQuery,
        category: selectedCategory,
        city: selectedCity,
        timestamp: new Date().toISOString()
      };
      
      // Keep only last 10 searches
      const updatedHistory = [searchTerm, ...searchHistory.slice(0, 9)];
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    }
    
    // Update URL without reloading page
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    if (selectedSubcategory && selectedSubcategory !== "all") params.append("subcategory", selectedSubcategory);
    if (selectedCity) params.append("city", selectedCity);
    if (selectedDistrict && selectedDistrict !== "all") params.append("district", selectedDistrict);
    if (minRating > 0) params.append("minRating", minRating.toString());
    if (openNow) params.append("openNow", "true");
    if (sortBy !== "relevance") params.append("sort", sortBy);
    
    // Update URL without reload
    window.history.pushState({}, '', `/buscar?${params.toString()}`);
    
    // Trigger refetch
    refetch();
  };
  
  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedDistrict("all");
    setMinRating(0);
    setMaxPrice(4);
    setOpenNow(false);
    setSortBy("relevance");
    
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCity) params.append("city", selectedCity);
    
    // Update URL without reload
    window.history.pushState({}, '', `/buscar?${params.toString()}`);
    
    // Trigger refetch
    refetch();
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
    
    // Simple bounds checking without Google Maps dependency
    const lat = business.location.lat;
    const lng = business.location.lng;
    
    // Get bounds coordinates using our OpenStreetMap format
    const north = mapBounds.getNorthEast().lat();
    const south = mapBounds.getSouthWest().lat();
    const east = mapBounds.getNorthEast().lng();
    const west = mapBounds.getSouthWest().lng();
    
    return lat >= south && lat <= north && lng >= west && lng <= east;
  };

  // Client-side filtering and sorting
  useEffect(() => {
    if (!searchResults || !searchResults.results) {
      setFilteredResults([]);
      return;
    }
    
    let filtered = [...searchResults.results];
    
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
    // Only reset to page 1 when filters change, not on every render
  }, [searchResults, minRating, maxPrice, selectedDistrict, openNow, sortBy, mapBounds, mapFilterEnabled]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedCity, selectedDistrict, minRating, openNow, sortBy, mapFilterEnabled]);

  // Simple pagination - no infinite scroll
  const displayResults = searchResults?.results || [];

  const handleBusinessView = (customUrl: string) => {
    setLocation(`/${customUrl}`);
  };

  const handleBusinessBook = (businessId: string | number) => {
    // Navigate to booking page or open booking modal
    console.log('Book business:', businessId);
    // TODO: Implement booking flow
  };

  const handleBusinessSave = (businessId: string | number) => {
    // Save to user's favorites
    const saved = JSON.parse(localStorage.getItem('savedBusinesses') || '[]');
    if (!saved.includes(businessId)) {
      saved.push(businessId);
      localStorage.setItem('savedBusinesses', JSON.stringify(saved));
    }
    console.log('Saved business:', businessId);
  };

  // Use server-side pagination data directly
  const allBusinesses = displayResults;
  const registeredBusinesses = allBusinesses.filter((b: any) => b.type === "registered") || [];
  const publicBusinesses = allBusinesses.filter((b: any) => b.type === "public") || [];
  const googlePlacesResults = allBusinesses.filter((b: any) => b.type === "google") || [];
  
  // Use server-side pagination information
  const totalResults = paginationInfo.totalResults || 0;
  const totalPages = paginationInfo.totalPages || 1;
  const startIndex = ((paginationInfo.currentPage || 1) - 1) * (paginationInfo.resultsPerPage || resultsPerPage);
  const endIndex = startIndex + (paginationInfo.resultsPerPage || resultsPerPage);
  
  console.log('Search results data:', {
    registered: registeredBusinesses.length,
    public: publicBusinesses.length,
    google: googlePlacesResults.length,
    pagination: paginationInfo
  });
  


  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {/* Modern Search Bar */}
            <ModernSearchBar
              value={searchQuery}
              location={selectedCity || ""}
              onSearch={(query, location, district) => {
                setSearchQuery(query);
                setSelectedCity(location);
                if (district) {
                  setSelectedDistrict(district);
                }
                handleSearch();
              }}
              onLocationChange={setSelectedCity}
              isLoading={isLoading}
              showDistrictFilter={true}
            />

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
                  {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button
                    onClick={() => setSelectedCategory("")}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {(searchQuery || (selectedCategory && selectedCategory !== "all") || (selectedSubcategory && selectedSubcategory !== "all") || selectedCity || (selectedDistrict && selectedDistrict !== "all") || minRating > 0 || openNow || sortBy !== "relevance") && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  Limpiar filtros
                </Button>
              )}
              
              {/* View Toggle and Results Per Page */}
              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex items-center space-x-1 rounded",
                      viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-gray-50"
                    )}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                    <span>Cuadrícula</span>
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex items-center space-x-1 rounded",
                      viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-gray-50"
                    )}
                  >
                    <List className="w-4 h-4" />
                    <span>Lista</span>
                  </Button>
                  <Button
                    variant={viewMode === "map" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("map")}
                    className={cn(
                      "flex items-center space-x-1 rounded",
                      viewMode === "map" ? "bg-white shadow-sm" : "hover:bg-gray-50"
                    )}
                  >
                    <Map className="w-4 h-4" />
                    <span>Mapa</span>
                  </Button>
                </div>
                
                {/* Results Per Page Selector */}
                {viewMode !== "map" && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Mostrar:</span>
                    <Select value={resultsPerPage.toString()} onValueChange={(value) => setResultsPerPage(parseInt(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">9</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">por página</span>
                  </div>
                )}
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
                  {totalPages > 1 && (
                    <span className="ml-2">• Página {currentPage} de {totalPages}</span>
                  )}
                  <span className="ml-2">• Mostrando {startIndex + 1}-{Math.min(endIndex, totalResults)} de {totalResults}</span>
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
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({category.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategoría
                      </label>
                      <Select 
                        value={selectedSubcategory} 
                        onValueChange={setSelectedSubcategory}
                        disabled={!selectedCategory || selectedCategory === "all" || subcategoriesData.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCategory || selectedCategory === "all"
                              ? "Selecciona una categoría primero" 
                              : subcategoriesData.length === 0 
                                ? "No hay subcategorías disponibles"
                                : "Todas las subcategorías"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las subcategorías</SelectItem>
                          {subcategoriesData.map((item: any) => (
                            <SelectItem key={item.subcategory} value={item.subcategory}>
                              {item.subcategory} ({item.count})
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

                    {/* Enhanced Contact Information Filters */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Información de Contacto
                      </label>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPhone"
                            checked={hasPhone}
                            onCheckedChange={setHasPhone}
                          />
                          <label htmlFor="hasPhone" className="text-sm font-medium">
                            Tiene teléfono
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasWebsite"
                            checked={hasWebsite}
                            onCheckedChange={setHasWebsite}
                          />
                          <label htmlFor="hasWebsite" className="text-sm font-medium">
                            Tiene sitio web
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasEmail"
                            checked={hasEmail}
                            onCheckedChange={setHasEmail}
                          />
                          <label htmlFor="hasEmail" className="text-sm font-medium">
                            Tiene email
                          </label>
                        </div>
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
        {/* Personalized Recommendations Section */}
        {!searchQuery && currentPage === 1 && (
          <PersonalizedRecommendations 
            category={selectedCategory}
          />
        )}

        {isLoading ? (
          <div className={cn(
            "gap-6",
            viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            viewMode === "list" && "space-y-4"
          )}>
            {Array.from({ length: resultsPerPage }).map((_, index) => (
              <BusinessCardSkeleton key={index} />
            ))}
          </div>
        ) : viewMode === "map" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
            {/* Business List Sidebar */}
            <div className="order-1 lg:order-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {filteredResults.length} negocios encontrados
                  </h3>
                </div>
                
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
            <div className="order-2 lg:order-2 relative" style={{ height: '600px' }}>
              <OpenStreetMap
                businesses={filteredResults}
                onMapBoundsChange={mapFilterEnabled ? (bounds) => setMapBounds(bounds) : undefined}
                onBusinessClick={(business) => setSelectedBusiness(business)}
                selectedBusiness={selectedBusiness}
                className="h-full w-full"
                showPriceCards={true}
                isSearching={isMapSearching}
              />
              
              {/* Map Search Indicator */}
              {isMapSearching && mapFilterEnabled && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2 z-10">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  <span className="text-sm font-medium">Buscando en esta área...</span>
                </div>
              )}
              
              {/* Search in this area button */}
              {mapFilterEnabled && !isMapSearching && debouncedMapBounds !== mapBounds && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Button
                    onClick={() => setDebouncedMapBounds(mapBounds)}
                    className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-lg"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Buscar en esta área
                  </Button>
                </div>
              )}
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
                <div className={cn(
                  "gap-6",
                  viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  viewMode === "list" && "space-y-4"
                )}>
                  {registeredBusinesses.map((business: any) => (
                    viewMode === "list" ? (
                      <BusinessListItem
                        key={`registered-${business.id}`}
                        business={business}
                        onViewClick={() => handleBusinessView(business.customUrl || business.slug)}
                        onBookClick={() => handleBusinessBook(business.id)}
                        onSaveClick={() => handleBusinessSave(business.id)}
                      />
                    ) : (
                      <EnhancedBusinessCard
                        key={`registered-${business.id}`}
                        business={business}
                        onViewClick={() => handleBusinessView(business.customUrl || business.slug)}
                        onBookClick={() => handleBusinessBook(business.id)}
                        onSaveClick={() => handleBusinessSave(business.id)}
                      />
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {googlePlacesResults.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Negocios encontrados ({googlePlacesResults.length})
                  </h2>
                  <Badge className="bg-green-600 text-white">
                    Datos de Apify
                  </Badge>
                </div>
                
                <div className={cn(
                  "gap-6",
                  viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  viewMode === "list" && "space-y-4"
                )}>
                  {googlePlacesResults.map((business: any) => (
                    viewMode === "list" ? (
                      <BusinessListItem
                        key={`google-${business.id}`}
                        business={business}
                        onViewClick={() => {
                          setSelectedBusiness(business);
                          setShowBusinessModal(true);
                        }}
                        onBookClick={() => {
                          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.name + ' ' + business.address)}`;
                          window.open(googleMapsUrl, '_blank');
                        }}
                        onSaveClick={() => handleBusinessSave(business.id)}
                      />
                    ) : (
                      <div 
                        key={`business-${business.id}`} 
                        className="group cursor-pointer relative"
                        onClick={() => {
                          setSelectedBusiness(business);
                          setShowBusinessModal(true);
                        }}
                      >
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                          {/* Business Image */}
                          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200">
                            {business.photoUrl ? (
                              <img 
                                src={business.photoUrl} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            
                            {/* Fallback when no image */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${business.photoUrl ? 'hidden' : ''}`}>
                              <div className="text-white text-center">
                                <div className="text-3xl font-bold mb-2">{business.name.charAt(0).toUpperCase()}</div>
                                <div className="text-sm opacity-90 px-4 text-center line-clamp-2">{business.name}</div>
                              </div>
                            </div>
                            
                            {/* Rating Badge */}
                            {business.rating > 0 && (
                              <div className="absolute top-3 right-3 bg-white bg-opacity-95 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-full text-sm font-medium flex items-center shadow-md">
                                <span className="text-yellow-500 mr-1">★</span>
                                {business.rating.toFixed(1)}
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            {business.openNow !== undefined && (
                              <div className="absolute top-3 left-3">
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  business.openNow 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {business.openNow ? 'Abierto' : 'Cerrado'}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Business Details */}
                          <div className="p-4">
                            <div className="mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 group-hover:text-red-600 transition-colors">
                                {business.name}
                              </h3>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                              {business.address}
                            </p>
                            
                            {/* Rating and Reviews */}
                            {business.rating > 0 && (
                              <div className="flex items-center mb-3">
                                <div className="flex items-center mr-2">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`text-lg ${
                                      i < Math.floor(business.rating) ? 'text-yellow-400' : 'text-gray-200'
                                    }`}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">
                                  {business.rating.toFixed(1)}
                                  {business.reviewCount && ` (${business.reviewCount})`}
                                </span>
                              </div>
                            )}
                            
                            {/* Phone Number Display */}
                            {business.phone && (
                              <div className="flex items-center mb-3 text-sm text-gray-600">
                                <Phone className="w-4 h-4 mr-2 text-green-600" />
                                <span className="font-medium">{business.phone}</span>
                              </div>
                            )}
                            
                            {/* Action Button */}
                            <div className="flex items-center">
                              <Button 
                                size="sm" 
                                className="w-full bg-red-600 hover:bg-red-700 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Create Google Maps URL with the business location
                                  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.name + ' ' + business.address)}`;
                                  window.open(googleMapsUrl, '_blank');
                                }}
                              >
                                Ver más
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
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
                <div className={cn(
                  "gap-6",
                  viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  viewMode === "list" && "space-y-4"
                )}>
                  {publicBusinesses.map((business: any) => (
                    viewMode === "list" ? (
                      <BusinessListItem
                        key={`public-${business.id}`}
                        business={business}
                        onViewClick={() => handleBusinessView(business.id)}
                        onBookClick={() => handleBusinessBook(business.id)}
                        onSaveClick={() => handleBusinessSave(business.id)}
                      />
                    ) : (
                      <EnhancedBusinessCard
                        key={`public-${business.id}`}
                        business={business}
                        onViewClick={() => handleBusinessView(business.id)}
                        onBookClick={() => handleBusinessBook(business.id)}
                        onSaveClick={() => handleBusinessSave(business.id)}
                      />
                    )
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults && searchResults.results && searchResults.results.length === 0 && (
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

            {/* Pagination Controls */}
            {totalResults > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, totalResults)} de {totalResults} resultados
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCurrentPage(pageNum);
                          }}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Business Details Modal */}
      <Dialog open={showBusinessModal} onOpenChange={setShowBusinessModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBusiness && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedBusiness.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Business Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-red-500 to-red-600 rounded-xl overflow-hidden">
                  {selectedBusiness.photoUrl ? (
                    <img 
                      src={selectedBusiness.photoUrl} 
                      alt={selectedBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-white text-4xl font-bold">
                        {selectedBusiness.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  
                  {/* Rating badge */}
                  {selectedBusiness.rating > 0 && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-full font-medium flex items-center shadow-lg">
                      <span className="text-yellow-500 mr-2">★</span>
                      <span className="text-lg font-bold">{selectedBusiness.rating.toFixed(1)}</span>
                      {selectedBusiness.reviewCount && (
                        <span className="text-sm text-gray-600 ml-1">({selectedBusiness.reviewCount})</span>
                      )}
                    </div>
                  )}
                  
                  {/* Category badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                      {selectedBusiness.category.charAt(0).toUpperCase() + selectedBusiness.category.slice(1)}
                    </span>
                  </div>
                </div>
                
                {/* Rating and Reviews */}
                {selectedBusiness.rating > 0 && (
                  <div className="flex items-center space-x-3 py-4 border-b border-gray-100">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xl ${
                          i < Math.floor(selectedBusiness.rating) ? 'text-yellow-400' : 'text-gray-200'
                        }`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedBusiness.rating.toFixed(1)}
                    </div>
                    {selectedBusiness.reviewCount && (
                      <div className="text-gray-600">
                        basado en {selectedBusiness.reviewCount} reseñas
                      </div>
                    )}
                  </div>
                )}
                
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900">Información de Contacto</h3>
                    
                    {/* Address */}
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Dirección</p>
                        <p className="text-gray-600 leading-relaxed">{selectedBusiness.address}</p>
                      </div>
                    </div>
                    
                    {/* Phone */}
                    {selectedBusiness.phone && (
                      <div className="flex items-start space-x-3">
                        <Phone className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Teléfono</p>
                          <a 
                            href={`tel:${selectedBusiness.phone}`}
                            className="text-green-600 hover:underline font-medium"
                          >
                            {selectedBusiness.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Website */}
                    {selectedBusiness.website && (
                      <div className="flex items-start space-x-3">
                        <Globe className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Sitio Web</p>
                          <a 
                            href={selectedBusiness.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {selectedBusiness.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Email */}
                    {selectedBusiness.email && (
                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Email</p>
                          <a 
                            href={`mailto:${selectedBusiness.email}`}
                            className="text-purple-600 hover:underline break-all"
                          >
                            {selectedBusiness.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Business Hours */}
                  {selectedBusiness.hours && selectedBusiness.hours.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-gray-900">Horarios de Atención</h3>
                      <div className="space-y-2">
                        {selectedBusiness.hours.map((hour: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1">
                            <span className="text-gray-600 capitalize">
                              {typeof hour === 'string' ? hour.split(':')[0] || hour : hour.day}:
                            </span>
                            <span className="font-medium text-gray-900">
                              {typeof hour === 'string' ? hour.split(':').slice(1).join(':') || '' : hour.hours}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-4 pt-6 border-t border-gray-100">
                  {selectedBusiness.phone && (
                    <a
                      href={`tel:${selectedBusiness.phone}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-center font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Phone className="w-5 h-5" />
                      <span>Llamar Ahora</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBusiness.name + ' ' + selectedBusiness.address)}`;
                      window.open(googleMapsUrl, '_blank');
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg text-center font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Ver en Maps</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
