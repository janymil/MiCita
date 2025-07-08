import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  FileText,
  Download,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

export default function Finanzas() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");
  const [chartView, setChartView] = useState("weekly");

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/financials", selectedPeriod],
    enabled: !!businesses && businesses.length > 0,
  });

  const currentBusiness = businesses?.[0];

  if (businessesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-teal-600">Gestión Financiera</h1>
              <p className="text-gray-600">
                Controla tus ingresos, pagos y rendimiento financiero.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">Este Mes</SelectItem>
                  <SelectItem value="lastMonth">Mes Anterior</SelectItem>
                  <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="thisYear">Este Año</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button className="py-4 px-1 border-b-2 border-teal-500 font-medium text-sm text-teal-600">
              Resumen
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
              Ingresos
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
              Pagos
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700">
              Reportes
            </button>
          </nav>
        </div>

        {/* Financial KPI Cards */}
        {financialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                    <p className="text-2xl font-bold text-green-600">
                      S/0.00
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  0.0% vs mes anterior
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                    <p className="text-2xl font-bold text-orange-600">
                      S/0.00
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Valor Promedio por Cita</p>
                    <p className="text-2xl font-bold text-blue-600">
                      S/0.00
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Citas Completadas</p>
                    <p className="text-2xl font-bold text-purple-600">
                      0
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Evolution Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-purple-600">Evolución de Ingresos</CardTitle>
                <Select value={chartView} onValueChange={setChartView}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Ingresos Diarios</SelectItem>
                    <SelectItem value="weekly">Ingresos Semanales</SelectItem>
                    <SelectItem value="monthly">Ingresos Mensuales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-600">
                Ingresos mensuales de los últimos 12 meses
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">Gráfico de evolución de ingresos</p>
                  <p className="text-sm text-gray-400">Datos basados en citas completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-purple-600">Estado de Pagos</CardTitle>
              <p className="text-sm text-gray-600">
                Distribución de ingresos por estado
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">Gráfico de distribución de pagos</p>
                  <p className="text-sm text-gray-400">Completados vs Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-8 w-8 mb-2" />
              <p>No hay transacciones recientes</p>
              <p className="text-sm">Las transacciones aparecerán cuando completes citas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}