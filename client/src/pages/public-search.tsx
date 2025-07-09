import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Star, TrendingUp, Users, Award, ArrowRight, Filter } from "lucide-react";
import BusinessCard from "@/components/business-card";
import CategoryCard from "@/components/category-card";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export default function PublicSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["/api/search", { 
      q: searchQuery, 
      category: selectedCategory, 
      subcategory: selectedSubcategory, 
      city: selectedCity 
    }],
    enabled: searchQuery.length > 0 || selectedCategory.length > 0,
  });

  // Get subcategories for the selected category
  const { data: subcategories } = useQuery({
    queryKey: ["/api/subcategories", selectedCategory],
    enabled: !!selectedCategory && selectedCategory !== 'all',
  });

  const { data: featuredBusinesses } = useQuery({
    queryKey: ["/api/featured"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query dependency
  };

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory("");
  }, [selectedCategory]);

  const popularCategories = BUSINESS_CATEGORIES.slice(0, 8);
  const topCities = ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Iquitos"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-r from-red-600 via-red-700 to-orange-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center space-x-3 mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <Search className="text-white w-8 h-8" />
            </div>
            <span className="text-4xl font-bold text-white">Mi Cita</span>
          </Link>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Encuentra los mejores
            <br />
            <span className="text-yellow-300">negocios de Perú</span>
          </h1>
          
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            Descubre restaurantes, spas, servicios y más. Más de 50,000 negocios te esperan.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="¿Qué estás buscando? (ej. restaurante, spa, barbería)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 border-0 text-lg focus-visible:ring-0"
                />
              </div>
              
              <div className="relative min-w-[200px]">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 border-0 bg-transparent text-lg appearance-none focus:outline-none"
                >
                  <option value="">Toda ubicación</option>
                  {topCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" size="lg" className="h-14 px-8 bg-red-600 hover:bg-red-700 text-lg">
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </Button>
            </div>
          </form>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">50K+</div>
              <div className="text-white/80">Negocios</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">1M+</div>
              <div className="text-white/80">Reseñas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">25</div>
              <div className="text-white/80">Ciudades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">100%</div>
              <div className="text-white/80">Verificado</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Explora por categoría
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encuentra exactamente lo que necesitas navegando por nuestras categorías más populares
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {popularCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={() => setSelectedCategory(category.id)}
                className="hover:scale-105 transition-transform duration-200"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Search Results */}
      {(searchQuery || selectedCategory) && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-900">
                Resultados de búsqueda
                {searchQuery && (
                  <span className="text-gray-600 font-normal"> para "{searchQuery}"</span>
                )}
              </h3>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>

            {/* Subcategory Filter */}
            {selectedCategory && subcategories && subcategories.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-medium text-gray-700">Subcategorías:</span>
                  <Button
                    variant={selectedSubcategory === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubcategory("")}
                  >
                    Todas
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subcategories.map((subcategory) => (
                    <Button
                      key={subcategory}
                      variant={selectedSubcategory === subcategory ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSubcategory(
                        selectedSubcategory === subcategory ? "" : subcategory
                      )}
                      className="text-xs"
                    >
                      {subcategory}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : businesses && businesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((business: any) => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    onViewClick={() => window.open(`/${business.customUrl || business.slug}`, '_blank')}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <CardContent>
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No se encontraron resultados
                  </h3>
                  <p className="text-gray-600">
                    Intenta con otros términos de búsqueda o explora nuestras categorías
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Featured Businesses */}
      {featuredBusinesses && featuredBusinesses.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-yellow-100 text-yellow-800 px-4 py-2">
                <Award className="w-4 h-4 mr-2" />
                Destacados
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Negocios premium
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Los mejores negocios verificados y altamente calificados por nuestra comunidad
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBusinesses.map((business: any) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onViewClick={(slug) => window.open(`/negocio/${slug}`, '_blank')}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-red-600 to-orange-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Tienes un negocio?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Únete a miles de empresarios que ya promocionan su negocio en BuscarPerú.
            Aumenta tu visibilidad y conecta con más clientes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/business">
              <Button size="lg" className="bg-white text-red-600 hover:bg-gray-100 h-14 px-8 text-lg">
                Registrar mi negocio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-red-600 h-14 px-8 text-lg"
            >
              Ver planes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-white/90">
            <div className="flex items-center justify-center">
              <TrendingUp className="w-6 h-6 mr-3" />
              <span>Aumenta tus ventas</span>
            </div>
            <div className="flex items-center justify-center">
              <Users className="w-6 h-6 mr-3" />
              <span>Conecta con clientes</span>
            </div>
            <div className="flex items-center justify-center">
              <Star className="w-6 h-6 mr-3" />
              <span>Mejora tu reputación</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Search className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-bold">BuscarPerú</span>
              </Link>
              <p className="text-gray-400">
                La plataforma líder para descubrir y promocionar negocios en Perú.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Para usuarios</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Cómo buscar</a></li>
                <li><a href="#" className="hover:text-white">Escribir reseñas</a></li>
                <li><a href="#" className="hover:text-white">App móvil</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Para negocios</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/business" className="hover:text-white">Registrar negocio</Link></li>
                <li><a href="#" className="hover:text-white">Planes premium</a></li>
                <li><a href="#" className="hover:text-white">Centro de ayuda</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Contacto</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 BuscarPerú. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}