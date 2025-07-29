import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { MicrositeSettings } from "@/components/microsite-settings";
import { Globe } from "lucide-react";

export default function MicrositioPage() {
  // Get current business data
  const { data: businesses } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  const currentBusiness = businesses && Array.isArray(businesses) ? businesses[0] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center">
          <Globe className="w-8 h-8 mr-3 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Constructor de Micrositio
            </h1>
            <p className="text-gray-600 mt-1">
              Crea y personaliza tu página web profesional
            </p>
          </div>
        </div>

        {/* Microsite Settings Component */}
        {currentBusiness ? (
          <MicrositeSettings currentBusiness={currentBusiness} />
        ) : (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay negocio configurado
            </h3>
            <p className="text-gray-500">
              Primero debes configurar tu negocio para crear un micrositio.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
