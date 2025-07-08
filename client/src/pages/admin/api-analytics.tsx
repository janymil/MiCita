
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  Image,
  FileText,
  RefreshCw,
  Trash2,
  Eye
} from "lucide-react";

interface APICallRecord {
  id: string;
  timestamp: string;
  endpoint: string;
  query: string;
  status: 'success' | 'error';
  responseTime: number;
  resultCount?: number;
  apiType: 'search' | 'photo' | 'details';
  cost?: number;
}

interface APIStats {
  totalCalls: number;
  todayCalls: number;
  hourlyStats: { hour: string; calls: number; cost: number }[];
  apiTypeStats: { type: string; calls: number; cost: number }[];
  averageResponseTime: number;
  successRate: number;
  estimatedCost: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function APIAnalyticsPage() {
  const [isRealTime, setIsRealTime] = useState(true);

  const { data: stats, refetch: refetchStats } = useQuery<APIStats>({
    queryKey: ["/api/admin/analytics/api-calls"],
    refetchInterval: isRealTime ? 2000 : false, // Update every 2 seconds if real-time
  });

  const { data: recentCalls, refetch: refetchCalls } = useQuery<APICallRecord[]>({
    queryKey: ["/api/admin/analytics/recent-calls"],
    refetchInterval: isRealTime ? 2000 : false,
  });

  const clearStats = async () => {
    try {
      await fetch("/api/admin/analytics/api-calls", {
        method: "DELETE",
      });
      refetchStats();
      refetchCalls();
    } catch (error) {
      console.error("Error clearing stats:", error);
    }
  };

  const getAPITypeIcon = (type: string) => {
    switch (type) {
      case 'search': return <Search className="w-4 h-4" />;
      case 'photo': return <Image className="w-4 h-4" />;
      case 'details': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
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
            <Button onClick={() => { refetchStats(); refetchCalls(); }} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={clearStats} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="mb-6">
          <Badge className={`${isRealTime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            {isRealTime ? "Monitoreo en tiempo real activo" : "Monitoreo pausado"}
          </Badge>
        </div>

        {/* Main Stats Cards */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hourly Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Llamadas por Hora (Últimas 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.hourlyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* API Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Tipo de API</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.apiTypeStats || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, calls }) => `${type}: ${calls}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="calls"
                    >
                      {stats?.apiTypeStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent API Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Llamadas Recientes ({recentCalls?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls?.slice(0, 20).map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getAPITypeIcon(call.apiType)}
                      <Badge variant="outline">{call.apiType}</Badge>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{call.endpoint}</p>
                      <p className="text-sm text-gray-600 truncate max-w-xs">
                        Query: {call.query}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatTime(call.timestamp)}</p>
                      <p className="text-xs text-gray-500">{call.responseTime}ms</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {call.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCost(call.cost || 0)}</p>
                      {call.resultCount !== undefined && (
                        <p className="text-xs text-gray-500">{call.resultCount} results</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {!recentCalls?.length && (
              <div className="text-center py-8 text-gray-500">
                No hay llamadas API registradas aún
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
