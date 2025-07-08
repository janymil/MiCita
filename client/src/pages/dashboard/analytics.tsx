import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Star,
  Clock,
  Target
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { formatDatePeruvian } from "@/lib/utils";

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/analytics"],
  });

  const { data: appointments } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/appointments"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/clients"],
  });

  const { data: services } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/services"],
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate additional metrics
  const thisMonth = new Date();
  thisMonth.setDate(1);

  const monthlyAppointments = appointments?.filter((a: any) => 
    new Date(a.createdAt) >= thisMonth
  ).length || 0;

  const completedAppointments = appointments?.filter((a: any) => 
    a.status === "completed"
  ).length || 0;

  const monthlyRevenue = analytics?.revenue || 0;
  const averageServicePrice = services?.length > 0 
    ? services.reduce((sum: number, s: any) => sum + parseFloat(s.price || "0"), 0) / services.length
    : 0;

  const clientRetentionRate = clients?.length > 0 
    ? Math.round((completedAppointments / clients.length) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics y Reportes</h1>
          <p className="text-gray-600">
            Analiza el rendimiento de tu negocio y toma decisiones informadas
          </p>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    S/ {monthlyRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                <span className="text-green-600 font-medium">+12%</span>
                <span className="text-gray-600 ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Citas Este Mes</p>
                  <p className="text-3xl font-bold text-gray-900">{monthlyAppointments}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-blue-600" />
                <span className="text-blue-600 font-medium">+8%</span>
                <span className="text-gray-600 ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics?.totalClients || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-purple-600" />
                <span className="text-purple-600 font-medium">+15%</span>
                <span className="text-gray-600 ml-1">crecimiento</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Puntuación</p>
                  <p className="text-3xl font-bold text-gray-900">4.9</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-yellow-600 font-medium">142 reseñas</span>
                <span className="text-gray-600 ml-1">promedio</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Ingresos por Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-2 p-4">
                {analytics?.weeklyRevenue?.map((amount: number, index: number) => {
                  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
                  const maxHeight = Math.max(...(analytics.weeklyRevenue || [1]));
                  const height = (amount / maxHeight) * 200;

                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div
                        className="bg-red-500 rounded-t w-8 mb-2 transition-all hover:bg-red-600"
                        style={{ height: `${height}px` }}
                        title={`S/ ${amount}`}
                      ></div>
                      <span className="text-xs text-gray-600">{days[index]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                Total semanal: S/ {analytics?.weeklyRevenue?.reduce((a: number, b: number) => a + b, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Métricas de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tasa de Ocupación</p>
                    <p className="text-sm text-gray-600">Citas completadas vs programadas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">87%</p>
                    <Badge className="bg-green-100 text-green-800">Excelente</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Precio Promedio</p>
                    <p className="text-sm text-gray-600">Por servicio</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      S/ {averageServicePrice.toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Retención de Clientes</p>
                    <p className="text-sm text-gray-600">Clientes que regresan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{clientRetentionRate}%</p>
                    <Badge className="bg-purple-100 text-purple-800">
                      {clientRetentionRate > 70 ? "Muy Buena" : "Buena"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Tiempo Promedio</p>
                    <p className="text-sm text-gray-600">Por cita</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      {services?.length > 0 
                        ? Math.round(services.reduce((sum: number, s: any) => sum + s.duration, 0) / services.length)
                        : 0} min
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services?.map((service: any, index: number) => {
                const serviceAppointments = appointments?.filter((a: any) => 
                  a.serviceId === service.id
                ).length || 0;

                const popularity = services.length > 0 
                  ? (serviceAppointments / appointments?.length || 0) * 100
                  : 0;

                return (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>S/ {service.price}</span>
                          <span>{service.duration} min</span>
                          <span>{serviceAppointments} citas</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {popularity.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">popularidad</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Growth Recommendations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Recomendaciones de Crecimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Optimizar Horarios</h4>
                <p className="text-blue-800 text-sm">
                  Tus mejores días son martes y jueves. Considera ofrecer promociones 
                  los días con menor demanda.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Servicios Populares</h4>
                <p className="text-green-800 text-sm">
                  Tus servicios más solicitados tienen alta demanda. 
                  Considera aumentar la disponibilidad o precios.
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Retención de Clientes</h4>
                <p className="text-purple-800 text-sm">
                  Implementa un programa de fidelidad para clientes frecuentes 
                  y aumenta la tasa de retención.
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">Nuevos Servicios</h4>
                <p className="text-orange-800 text-sm">
                  Basado en tendencias del mercado, considera agregar servicios 
                  complementarios a tu oferta actual.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}