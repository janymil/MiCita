import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, ArrowRight, Rocket, Headphones, TrendingUp } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import CategoryCard from "@/components/CategoryCard";
import BusinessCard from "@/components/BusinessCard";
import ModernSearchBar from "@/components/ModernSearchBar";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("Lima, Perú");
  const [isSearching, setIsSearching] = useState(false);

  // Use hardcoded categories instead of dynamic API
  const categories = BUSINESS_CATEGORIES;

  const { data: featuredBusinesses } = useQuery({
    queryKey: ["/api/featured"],
  });

  const handleSearch = (query: string, location: string, district?: string) => {
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchQuery(query); // Update local state
    setSearchLocation(location); // Update local state

    // Save search to history for recommendations
    const searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const searchTerm = {
      query: query.trim(),
      location: location,
      district: district,
      timestamp: new Date().toISOString()
    };
    
    // Keep only last 10 searches
    const updatedHistory = [searchTerm, ...searchHistory.slice(0, 9)];
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    // Navigate to search results page
    const params = new URLSearchParams();
    params.append('q', query.trim());
    if (location && location !== 'Lima, Perú') {
      params.append('city', location);
    }
    if (district) {
      params.append('district', district);
    }

    const searchUrl = `/buscar?${params.toString()}`;
    console.log('Navigating to:', searchUrl);
    setLocation(searchUrl); // Use setLocation for client-side routing
    setIsSearching(false);
  };

  const handleCategoryClick = (categoryId: string) => {
    setLocation(`/buscar?category=${categoryId}`);
  };

  const handleBusinessView = (customUrl: string) => {
    setLocation(`/${customUrl}`);
  };

  const handleLocationChange = (location: string) => {
    setSearchLocation(location);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative peru-gradient py-20 px-4">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto text-center animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Descubre y Conecta con<br />
            <span className="text-yellow-200">Empresas Locales</span>
          </h1>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            La plataforma líder en Perú para encontrar servicios locales
          </p>

          {/* Modern Search Bar */}
          <div className="max-w-4xl mx-auto animate-slide-up">
            <ModernSearchBar
              value={searchQuery}
              location={searchLocation}
              onSearch={handleSearch}
              onLocationChange={handleLocationChange}
              isLoading={isSearching}
              className="bg-white rounded-2xl shadow-2xl"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 text-white">
            <div className="text-center animate-scale-in">
              <div className="text-3xl font-bold">12,847</div>
              <div className="text-white/80">Empresas</div>
            </div>
            <div className="text-center animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <div className="text-3xl font-bold">25</div>
              <div className="text-white/80">Categorías</div>
            </div>
            <div className="text-center animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-3xl font-bold">180</div>
              <div className="text-white/80">Ciudades</div>
            </div>
            <div className="text-center animate-scale-in" style={{ animationDelay: "0.3s" }}>
              <div className="text-3xl font-bold">245k</div>
              <div className="text-white/80">Reseñas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categorias" className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8 animate-fade-in">
            Explora por Categorías
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {(categories || []).map((category, index) => (
              <div
                key={category.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CategoryCard
                  category={category}
                  onClick={handleCategoryClick}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Empresas Destacadas
            </h2>
            <p className="text-xl text-gray-600">
              Descubre los negocios mejor valorados de tu zona
            </p>
          </div>

          {featuredBusinesses && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredBusinesses.map((business: any) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onViewClick={handleBusinessView}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/buscar">
              <Button variant="outline" className="group">
                Ver Todos los Negocios
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 peru-gradient rounded-lg flex items-center justify-center">
                  <Search className="text-white w-4 h-4" />
                </div>
                <span className="text-xl font-bold">BuscarPerú</span>
              </div>
              <p className="text-gray-400 mb-4">
                La plataforma líder para descubrir negocios locales en Perú.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Categorías</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/buscar?category=belleza" className="hover:text-white transition-colors">Belleza</Link></li>
                <li><Link href="/buscar?category=salud" className="hover:text-white transition-colors">Salud</Link></li>
                <li><Link href="/buscar?category=fitness" className="hover:text-white transition-colors">Fitness</Link></li>
                <li><Link href="/buscar?category=gastronomia" className="hover:text-white transition-colors">Restaurantes</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Ayuda</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Para Empresas</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://micita.replit.app/registro" className="hover:text-white transition-colors">Registrar Negocio</a></li>
                <li><a href="https://micita.replit.app/business" className="hover:text-white transition-colors">Planes</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2024 BuscarPerú. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Términos de Servicio</a>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}