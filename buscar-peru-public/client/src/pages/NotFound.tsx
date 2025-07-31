import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="space-x-4">
          <Link href="/">
            <Button>Ir al inicio</Button>
          </Link>
          <Link href="/buscar">
            <Button variant="outline">Buscar negocios</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}