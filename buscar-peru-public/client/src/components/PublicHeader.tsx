import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Search, Menu, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function PublicHeader() {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 peru-gradient rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">Mi Cita</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/buscar" className="text-gray-700 hover:text-red-600 transition-colors">
              Buscar Negocios
            </Link>
            <Link href="/#categorias" className="text-gray-700 hover:text-red-600 transition-colors">
              Categorías
            </Link>
            <a href="#" className="text-gray-700 hover:text-red-600 transition-colors">
              Ayuda
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    {user?.name}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="hidden md:block">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Registrar Empresa
                  </Button>
                </Link>
              </>
            )}
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col space-y-4 mt-8">
                  <Link href="/buscar" onClick={() => setIsMenuOpen(false)}>
                    Buscar Negocios
                  </Link>
                  <Link href="/#categorias" onClick={() => setIsMenuOpen(false)}>
                    Categorías
                  </Link>
                  <a href="#" onClick={() => setIsMenuOpen(false)}>
                    Ayuda
                  </a>
                  {!isAuthenticated && (
                    <>
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                        Iniciar Sesión
                      </Link>
                      <Link href="/registro" onClick={() => setIsMenuOpen(false)}>
                        Registrar Empresa
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
