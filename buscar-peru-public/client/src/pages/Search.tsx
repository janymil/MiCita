import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Filter, Star } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import BusinessCard from "@/components/BusinessCard";
import ModernSearchBar from "@/components/ModernSearchBar";
import { BUSINESS_CATEGORIES, PERUVIAN_CITIES, CITY_DISTRICTS } from "@/lib/constants";

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Get available districts for selected city
  const availableDistricts = selectedCity && CITY_DISTRICTS[selectedCity] ? CITY_DISTRICTS[selectedCity] : [];

  // Parse URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newQuery = urlParams.get("q") || "";
    const newCategory = urlParams.get("category") || "";
    const newCity = urlParams.get("location") || urlParams.get("city") || "";
    const newDistrict = urlParams.get("district") || "all";
    
    setSearchQuery(newQuery);
    setSelectedCategory(newCategory || "all");
    setSelectedCity(newCity);
    setSelectedDistrict(newDistrict);
    setCurrentPage(1);
  }, [location]);

  // Search API query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: [
      "/api/search", 
      searchQuery,
      selectedCategory,
      selectedCity,
      selectedDistrict,
      minRating,
      sortBy,
      currentPage
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedDistrict && selectedDistrict !== "all") params.append("district", selectedDistrict);
      if (minRating > 0) params.append("minRating", minRating.toString());
      if (sortBy !== "relevance") params.append("sort", sortBy);
      params.append("page", currentPage.toString());
      params.append("limit", "12");
      
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
  });

  const handleSearch = (query: string, location: string, district?: string) => {
    setSearchQuery(query);
    if (location !== selectedCity) {
      setSelectedCity(location);
    }
    if (district && district !== selectedDistrict) {
      setSelectedDistrict(district);
    }
    
    // Update URL
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (location) params.append("city", location);
    if (district) params.append("district", district);
    
    setLocation(`/buscar?${params.toString()}`);
  };

  const handleBusinessView = (slug: string) => {
    setLocation(`/${slug}`);
  };

  const businesses = searchResults?.results || [];
  const totalResults = searchResults?.totalResults || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Search Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <ModernSearchBar
            value={searchQuery}
            location={selectedCity || "Lima, Perú"}
            onSearch={handleSearch}
            onLocationChange={setSelectedCity}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
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
                {selectedCity && availableDistricts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Distrito
                    </label>
                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los distritos" />
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
                )}

                {/* Rating Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Calificación mínima
                  </label>
                  <Select value={minRating.toString()} onValueChange={(value) => setMinRating(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Cualquier calificación</SelectItem>
                      <SelectItem value="3">3+ estrellas</SelectItem>
                      <SelectItem value="4">4+ estrellas</SelectItem>
                      <SelectItem value="4.5">4.5+ estrellas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Ordenar por
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevancia</SelectItem>
                      <SelectItem value="rating">Mejor valorados</SelectItem>
                      <SelectItem value="distance">Más cercanos</SelectItem>
                      <SelectItem value="name">Nombre A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {searchQuery ? `Resultados para "${searchQuery}"` : "Explorar negocios"}
                </h2>
                {totalResults > 0 && (
                  <Badge variant="secondary">
                    {totalResults.toLocaleString()} resultados
                  </Badge>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {!isLoading && businesses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {businesses.map((business: any) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    onViewClick={handleBusinessView}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && businesses.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-600 mb-4">
                  Intenta con otros términos de búsqueda o cambia los filtros.
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedDistrict("all");
                    setMinRating(0);
                  }}
                  variant="outline"
                >
                  Limpiar filtros
                </Button>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && businesses.length > 0 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Página {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    disabled={businesses.length < 12}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}