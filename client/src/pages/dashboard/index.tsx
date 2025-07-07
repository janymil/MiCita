import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  Eye,
  Plus,
  Clock
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

export default function Dashboard() {
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/analytics"],
    enabled: !!businesses && businesses.length > 0,
  });

  const { data: recentAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/dashboard/businesses/1/appointments"],
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

  if (!businesses || businesses.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bienvenido a BuscarPeru
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza creando tu primer negocio para acceder al dashboard completo
            </p>
            <Link href="/dashboard/configuracion">
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Mi Negocio
              </Button>
            </Link>
          </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Bienvenido de vuelta, aquí tienes un resumen de tu negocio
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href={`/negocio/${currentBusiness?.slug}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Micrositio
                </Button>
              </Link>
              <Link href="/dashboard/citas">
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cita
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Business Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {currentBusiness?.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentBusiness?.name}
                </h2>
                <p className="text-gray-600">{currentBusiness?.description}</p>
                <div className="flex items-center mt-2 space-x-4">
                  <Badge className="bg-red-100 text-red-800">
                    {currentBusiness?.category}
                  </Badge>
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current mr-1" />
                    <span className="text-sm">
                      {currentBusiness?.rating} ({currentBusiness?.reviewCount} reseñas)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {analyticsLoading ? (
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
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      S/ {analytics?.revenue?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12% vs mes anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Citas Este Mes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.appointments || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +8% vs mes anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Clientes Nuevos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.newClients || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-purple-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +15% vs mes anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.totalClients || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresos Semanales</CardTitle>
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
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Próximas Citas</CardTitle>
              <Link href="/dashboard/citas">
                <Button variant="outline" size="sm">
                  Ver Todas
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentAppointments && recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {recentAppointments.slice(0, 5).map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Cliente #{appointment.clientId}
                        </div>
                        <div className="text-sm text-gray-600">
                          Servicio #{appointment.serviceId}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(appointment.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-red-600">
                        S/ {appointment.price}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto h-8 w-8 mb-2" />
                  <p>No hay citas programadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/citas">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Gestionar Citas</h4>
                  <p className="text-sm text-gray-600">Ver y organizar tu calendario</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/clientes">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Administrar Clientes</h4>
                  <p className="text-sm text-gray-600">Base de datos de clientes</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/servicios">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Configurar Servicios</h4>
                  <p className="text-sm text-gray-600">Precios y descripciones</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
