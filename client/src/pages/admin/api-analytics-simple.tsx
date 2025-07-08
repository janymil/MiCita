import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  RefreshCw,
  Trash2,
  Eye
} from "lucide-react";

interface APIStats {
  totalCalls: number;
  todayCalls: number;
  averageResponseTime: number;
  successRate: number;
  estimatedCost: number;
}

function APIAnalyticsSimple() {
  const [isRealTime, setIsRealTime] = useState(true);

  const { data: stats, refetch: refetchStats } = useQuery<APIStats>({
    queryKey: ["/api/admin/analytics/api-calls"],
    refetchInterval: isRealTime ? 2000 : false,
  });

  const clearStats = async () => {
    try {
      await fetch("/api/admin/analytics/api-calls", {
        method: "DELETE",
      });
      refetchStats();
    } catch (error) {
      console.error("Error clearing stats:", error);
    }
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google API Analytics</h1>
            <p className="text-gray-600">Monitoreo en tiempo real de llamadas a Google Places API</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsRealTime(!isRealTime)}
              variant={isRealTime ? "default" : "outline"}
              className="flex items-center space-x-2"
            >
              <Activity className="w-4 h-4" />
              <span>{isRealTime ? "Tiempo Real ON" : "Tiempo Real OFF"}</span>
            </Button>
            <Button onClick={refetchStats} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={clearStats} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Badge className={`${isRealTime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isRealTime ? "Monitoreo en tiempo real activo" : "Monitoreo pausado"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalCalls || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoy</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.todayCalls || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">
                  {stats?.successRate?.toFixed(1)}%
                </span>
                <span className="text-gray-600 ml-1">tasa de éxito</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.averageResponseTime?.toFixed(0) || 0}ms
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Costo Estimado</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats ? formatCost(stats.estimatedCost) : '$0.00'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              API Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Dashboard simplificado - Los gráficos se cargarán en la próxima actualización
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default APIAnalyticsSimple;