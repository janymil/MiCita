import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAuth } from "@/contexts/auth-context";

interface DashboardBusiness {
  id: number;
  name: string;
  category?: string;
  isPremium?: boolean | null;
}

interface DashboardSettings {
  customUrl?: string | null;
  enablePublicBooking?: boolean | null;
}

interface AppointmentRow {
  id: number;
  date: string;
  time: string;
  status: string;
  clientName?: string;
  serviceName?: string;
  price?: string | null;
}

interface MetricBucket {
  key: string;
  label: string;
  start: string;
  end: string;
  revenue: number;
  completed: number;
  created: number;
  cancelled: number;
}

interface DashboardAnalytics {
  pendingAppointments?: number;
  confirmedToday?: number;
  totalClients?: number;
  totalServices?: number;
  /** 7-point legacy series (oldest → newest) */
  weeklyRevenue?: number[];
  weeklyRevenueLabels?: string[];
  buckets?: MetricBucket[];
  granularity?: "day" | "week" | "month";
  totalRevenue?: number;
  revenue?: number;
  revenueGrowth?: number | null;
  completedGrowth?: number | null;
  collected?: number;
  receivable?: number;
  pendingPayments?: number;
  averageAppointmentValue?: number;
  completedAppointments?: number;
  cancelledInPeriod?: number;
  noShowInPeriod?: number;
  cancelRate?: number;
  noShowRate?: number;
  retentionRate?: number;
  occupancyRate?: number;
  newClients?: number;
  appointmentsInPeriod?: number;
  upcomingAppointments?: AppointmentRow[];
  [key: string]: unknown;
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [revenueChartView, setRevenueChartView] = useState<"day" | "week" | "month">("week");


  const { data: businesses, isLoading: businessesLoading } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });

  const businessId = businesses?.[0]?.id;

  const { data: analytics, isLoading: analyticsLoading } = useQuery<DashboardAnalytics>({
    queryKey: [`/api/dashboard/businesses/${businessId}/analytics`, { period: "last30Days", granularity: revenueChartView }],
    enabled: !!businessId,
  });

  const { data: recentAppointments, isLoading: appointmentsLoading } = useQuery<AppointmentRow[]>({
    queryKey: [`/api/dashboard/businesses/${businessId}/appointments`],
    enabled: !!businessId,
  });

  const currentBusiness = businesses?.[0];

  const { data: businessSettings } = useQuery<DashboardSettings>({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`],
    enabled: Boolean(currentBusiness?.id),
  });

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
              Bienvenido a Mi Cita
            </h3>
            <p className="text-gray-600 mb-6">
              Comienza creando tu primer negocio para acceder al dashboard completo
            </p>
            <Link href="/dashboard/configuracion">
              <Button className="theme-primary text-white hover:opacity-90">
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
      <div className="p-6 theme-bg min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-hand text-2xl leading-tight text-[hsl(var(--brand-manta))]">
                ¡Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
              </p>
              <h1 className="text-3xl font-display font-bold tracking-tight text-[hsl(var(--brand-tinta))]">Tu negocio hoy</h1>
              <p className="text-[hsl(var(--brand-tinta-soft))]">
                Citas, clientes e ingresos de {currentBusiness?.name || "tu emprendimiento"} en un solo lugar
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {businessSettings?.customUrl ? (
                <Link href={`/${businessSettings.customUrl}`}>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Micrositio
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/configuracion">
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Configurar Micrositio
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/citas">
                <Button className="brand-btn-primary border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cita
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Onboarding checklist — a new business must reach a bookable micrositio */}
        {(!businessSettings?.customUrl || (analytics?.totalServices ?? 0) === 0) && (
          <Card className="brand-card mb-8 border-dashed border-2">
            <CardContent className="p-5">
              <h3 className="font-display font-bold text-[hsl(var(--brand-tinta))] mb-1">
                Completa tu puesta en marcha
              </h3>
              <p className="text-sm text-[hsl(var(--brand-tinta-soft))] mb-4">
                Tres pasos para empezar a recibir reservas en tu micrositio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href="/dashboard/micrositio">
                  <div className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                    <span className={businessSettings?.customUrl ? "text-green-600" : "text-amber-600"}>
                      {businessSettings?.customUrl ? "✓" : "1"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">Publica tu URL</p>
                      <p className="text-xs text-muted-foreground">
                        {businessSettings?.customUrl ? `/${businessSettings.customUrl}` : "Elige tu dirección pública"}
                      </p>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/servicios">
                  <div className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                    <span className={(analytics?.totalServices ?? 0) > 0 ? "text-green-600" : "text-amber-600"}>
                      {(analytics?.totalServices ?? 0) > 0 ? "✓" : "2"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">Crea tus servicios</p>
                      <p className="text-xs text-muted-foreground">
                        {(analytics?.totalServices ?? 0) > 0
                          ? `${analytics?.totalServices} servicios activos`
                          : "Precio y duración"}
                      </p>
                    </div>
                  </div>
                </Link>
                <Link href="/dashboard/configuracion">
                  <div className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/40">
                    <span className="text-[#B8720B]">3</span>
                    <div>
                      <p className="text-sm font-medium">Define tu horario</p>
                      <p className="text-xs text-muted-foreground">Así se generan los horarios disponibles</p>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}


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
            <Card className="brand-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Citas Pendientes</p>
                    <p className="text-2xl font-bold text-[hsl(var(--brand-tinta))]">
                      {analytics?.pendingAppointments || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[hsl(38_85%_92%)] flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#B8720B]" />
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-[#B8720B]">
                  Ver más →
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Citas Confirmadas Hoy</p>
                    <p className="text-2xl font-bold text-[hsl(var(--brand-tinta))]">
                      {analytics?.confirmedToday || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[hsl(175_45%_93%)] flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[hsl(var(--brand-teal))]" />
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-[hsl(var(--brand-teal))]">
                  Ver más →
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Total Clientes</p>
                    <p className="text-2xl font-bold text-[hsl(var(--brand-tinta))]">
                      {analytics?.totalClients || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[hsl(5_80%_94%)] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[hsl(var(--brand-manta))]" />
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-[hsl(var(--brand-manta))]">
                  Ver más →
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Total Servicios</p>
                    <p className="text-2xl font-bold text-[hsl(var(--brand-tinta))]">
                      {analytics?.totalServices || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[hsl(36_35%_92%)] flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-[hsl(var(--brand-tinta))]" />
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">
                  Ver más →
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ingresos por Período</CardTitle>
                <Select value={revenueChartView} onValueChange={(value) => setRevenueChartView(value as "day" | "week" | "month")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="day">Ingresos Diarios</SelectItem>
                  <SelectItem value="week">Ingresos Semanales</SelectItem>
                  <SelectItem value="month">Ingresos Mensuales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-600">
                Ingresos facturados por fecha de servicio (citas completadas)
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const buckets = analytics?.buckets ?? [];
                const maxRevenue = Math.max(1, ...buckets.map((bucket) => bucket.revenue));
                if (buckets.length === 0) {
                  return (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                      <BarChart3 className="h-8 w-8 mb-2" />
                      <p className="text-sm">Aún no hay datos en este período</p>
                    </div>
                  );
                }
                return (
                  <div className="h-64 flex items-end justify-between gap-1 p-4 overflow-hidden">
                    {buckets.map((bucket) => {
                      const height = maxRevenue > 0 ? (bucket.revenue / maxRevenue) * 200 : 0;
                      return (
                        <div key={bucket.key} className="flex flex-col items-center flex-1 min-w-0">
                          <div
                            className="rounded-t-lg w-full max-w-10 mb-2 transition-all hover:opacity-85 hover:scale-y-105 origin-bottom bg-gradient-to-t from-[hsl(var(--brand-manta))] to-[hsl(var(--brand-gold))]"
                            style={{ height: `${Math.max(height, bucket.revenue > 0 ? 4 : 0)}px` }}
                            title={`${bucket.label}: S/ ${bucket.revenue.toFixed(2)} · ${bucket.completed} citas`}
                          ></div>
                          <span className="text-[10px] text-gray-600 truncate w-full text-center">{bucket.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
              ) : analytics?.upcomingAppointments && analytics.upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {analytics.upcomingAppointments.map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center space-x-4 p-3 rounded-xl border border-[hsl(var(--brand-crema-deep))] bg-[hsl(var(--brand-crema)/0.6)]">
                      <div className="w-12 h-12 rounded-full bg-[hsl(5_80%_94%)] flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[hsl(var(--brand-manta))]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {appointment.clientName || `Cliente #${appointment.clientId}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.serviceName || `Servicio #${appointment.serviceId}`}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(appointment.date).toLocaleDateString()} - {appointment.time}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-[hsl(var(--brand-manta))]">
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

        {/* Financial Summary */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display font-bold text-[hsl(var(--brand-tinta))]">Resumen Financiero</h3>
            <Link href="/dashboard/finanzas">
              <Button variant="outline" size="sm" className="text-teal-600 hover:text-teal-700">
                Ver Finanzas Completas
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="brand-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Facturado (30 días)</p>
                    <p className="text-xl font-bold text-[hsl(var(--brand-teal))]">
                      S/ {(analytics?.revenue ?? 0).toFixed(2)}
                    </p>
                    {typeof analytics?.revenueGrowth === "number" && (
                      <p className={`text-xs font-medium ${analytics.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {analytics.revenueGrowth >= 0 ? "▲" : "▼"} {Math.abs(analytics.revenueGrowth).toFixed(0)}% vs período anterior
                      </p>
                    )}
                  </div>
                  <DollarSign className="w-8 h-8 text-[hsl(var(--brand-teal))]" />
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Por cobrar (próximas)</p>
                    <p className="text-xl font-bold text-[#B8720B]">
                      S/ {(analytics?.pendingPayments ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-[#B8720B]" />
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Ticket promedio</p>
                    <p className="text-xl font-bold text-[hsl(var(--brand-manta))]">
                      S/ {(analytics?.averageAppointmentValue ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-[hsl(var(--brand-manta))]" />
                </div>
              </CardContent>
            </Card>

            <Card className="brand-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--brand-tinta-soft))]">Citas Completadas</p>
                    <p className="text-xl font-bold text-[hsl(var(--brand-tinta))]">
                      {analytics?.completedAppointments || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-[hsl(var(--brand-tinta))]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xl font-display font-bold text-[hsl(var(--brand-tinta))] mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/citas">
              <Card className="brand-card cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-[hsl(var(--brand-manta))] mb-2" />
                  <h4 className="font-semibold text-[hsl(var(--brand-tinta))]">Gestionar Citas</h4>
                  <p className="text-sm text-[hsl(var(--brand-tinta-soft))]">Ver y organizar tu calendario</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/clientes">
              <Card className="brand-card cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto h-8 w-8 text-[hsl(var(--brand-teal))] mb-2" />
                  <h4 className="font-semibold text-[hsl(var(--brand-tinta))]">Administrar Clientes</h4>
                  <p className="text-sm text-[hsl(var(--brand-tinta-soft))]">Base de datos de clientes</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/servicios">
              <Card className="brand-card cursor-pointer">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-[#B8720B] mb-2" />
                  <h4 className="font-semibold text-[hsl(var(--brand-tinta))]">Configurar Servicios</h4>
                  <p className="text-sm text-[hsl(var(--brand-tinta-soft))]">Precios y descripciones</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
