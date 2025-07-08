import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, ArrowRight, Rocket, Headphones, TrendingUp } from "lucide-react";
import PublicHeader from "@/components/public-header";
import CategoryCard from "@/components/category-card";
import BusinessCard from "@/components/business-card";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("Lima, Perú");
  const [isSearching, setIsSearching] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: featuredBusinesses } = useQuery({
    queryKey: ["/api/featured"],
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      return;
    }
    
    setIsSearching(true);
    
    // Force navigation to search results page
    const searchUrl = `/buscar?q=${encodeURIComponent(searchQuery.trim())}`;
    console.log('Navigating to:', searchUrl);
    window.location.href = searchUrl; // Force full page navigation
  };

  const handleCategoryClick = (categoryId: string) => {
    setLocation(`/buscar?category=${categoryId}`);
  };

  const handleBusinessView = (customUrl: string) => {
    setLocation(`/${customUrl}`);
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
            La plataforma líder en Perú para encontrar servicios locales y gestionar tu negocio
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-2 shadow-2xl max-w-3xl mx-auto animate-slide-up">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-4 py-3 border-r border-gray-200">
                <Search className="text-gray-400 mr-3 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="¿Qué servicio necesitas?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex-1 flex items-center px-4 py-3">
                <MapPin className="text-gray-400 mr-3 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Lima, Perú"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="border-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 w-5 h-5" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
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
            {BUSINESS_CATEGORIES.map((category, index) => (
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

      {/* Business Dashboard Demo */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-6">
              Gestiona tu Negocio con Tecnología Avanzada
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Plataforma completa de gestión empresarial con dashboard de analytics, calendario de citas y micrositio profesional
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Dashboard Preview */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 peru-gradient rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Panel de Control</h3>
                  <p className="text-sm text-gray-600">Dashboard Empresarial</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold mb-1">S/ 15,840</div>
                  <div className="text-green-100">Ingresos del Mes</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold mb-1">147</div>
                  <div className="text-blue-100">Citas Este Mes</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold mb-1">89</div>
                  <div className="text-purple-100">Clientes Nuevos</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold mb-1">4.9</div>
                  <div className="text-orange-100">Puntuación Media</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link href="/registro">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Crear Mi Dashboard
                  </Button>
                </Link>
                <Button variant="outline">
                  Ver Demo Completa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 peru-gradient">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ¿Listo para Hacer Crecer tu Negocio?
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            Únete a miles de empresas peruanas que ya están utilizando nuestra plataforma para gestionar y hacer crecer sus negocios
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro">
              <Button className="bg-white text-red-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors">
                Comenzar Prueba Gratuita
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors bg-transparent"
            >
              Agendar Demostración
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="text-center">
              <Rocket className="mx-auto text-3xl mb-4 opacity-80 w-8 h-8" />
              <h3 className="font-semibold mb-2">Configuración Rápida</h3>
              <p className="text-white/80">Tu micrositio listo en menos de 30 minutos</p>
            </div>
            <div className="text-center">
              <Headphones className="mx-auto text-3xl mb-4 opacity-80 w-8 h-8" />
              <h3 className="font-semibold mb-2">Soporte 24/7</h3>
              <p className="text-white/80">Equipo técnico disponible cuando lo necesites</p>
            </div>
            <div className="text-center">
              <TrendingUp className="mx-auto text-3xl mb-4 opacity-80 w-8 h-8" />
              <h3 className="font-semibold mb-2">Crecimiento Garantizado</h3>
              <p className="text-white/80">Aumenta tus ventas con herramientas profesionales</p>
            </div>
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
                <span className="text-xl font-bold">BuscarPeru</span>
              </div>
              <p className="text-gray-400 mb-4">
                La plataforma líder en gestión empresarial y descubrimiento de negocios locales en Perú.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Para Empresas</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/registro" className="hover:text-white transition-colors">Crear Cuenta</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Características</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Categorías</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/buscar?category=belleza" className="hover:text-white transition-colors">Belleza</Link></li>
                <li><Link href="/buscar?category=salud" className="hover:text-white transition-colors">Salud</Link></li>
                <li><Link href="/buscar?category=fitness" className="hover:text-white transition-colors">Fitness</Link></li>
                <li><Link href="/buscar?category=restaurante" className="hover:text-white transition-colors">Restaurantes</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2024 BuscarPeru. Todos los derechos reservados.
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
