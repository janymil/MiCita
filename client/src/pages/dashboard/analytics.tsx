import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star,
  Clock, Target, Eye, MousePointerClick, MessageCircle, Percent,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import PopularTimes from "@/components/popular-times";

interface DashboardBusiness { id: number; name: string }

interface MetricBucket {
  key: string; label: string; start: string; end: string;
  revenue: number; completed: number; created: number; cancelled: number;
}

interface ServicePerformance {
  serviceId: number; name: string; appointments: number; completed: number; revenue: number; share: number;
}

interface PopularTimeCell { day: number; hour: number; count: number; popularity: number }

interface AnalyticsData {
  period: { from: string; to: string; previousFrom: string; previousTo: string };
  granularity: "day" | "week" | "month";
  revenue: number; previousRevenue: number; revenueGrowth: number | null; totalRevenue: number;
  collected: number; receivable: number;
  completedAppointments: number; completedGrowth: number | null;
  appointmentsInPeriod: number; appointmentsCreatedInPeriod: number;
  pendingAppointments: number; confirmedToday: number;
  cancelledInPeriod: number; noShowInPeriod: number; cancelRate: number; noShowRate: number;
  pendingPayments: number; averageAppointmentValue: number; averageDurationMinutes: number;
  occupancyRate: number; totalClients: number; newClients: number; returningClients: number; retentionRate: number;
  totalServices: number; serviceBreakdown: ServicePerformance[]; buckets: MetricBucket[];
  popularTimes: PopularTimeCell[];
  views: number; whatsappClicks: number; bookClicks: number;
  viewToBookingRate: number; clickToBookingRate: number;
  trafficSeries: Array<{ day: string; views: number; whatsappClicks: number; bookClicks: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
}

interface ReviewsResponse {
  reviews: Array<{ id: number; rating: number; status?: string | null; ownerReply?: string | null }>;
  stats: { total: number; approved: number; pending: number; averageRating: number; replyRate: number };
}

const PERIODS = [
  { value: "last7Days", label: "Últimos 7 días" },
  { value: "last30Days", label: "Últimos 30 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes anterior" },
  { value: "last3Months", label: "Últimos 3 meses" },
  { value: "thisYear", label: "Este año" },
  { value: "all", label: "Todo el historial" },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(value || 0);

const formatPct = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;

function Growth({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">Sin período anterior comparable</span>;
  }
  const positive = value >= 0;
  return (
    <span className={`text-xs font-medium inline-flex items-center gap-1 ${positive ? "text-green-600" : "text-red-600"}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}{value.toFixed(1)}% vs período anterior
    </span>
  );
}

function Kpi({
  label, value, hint, icon: Icon, children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-3">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [period, setPeriod] = useState("last30Days");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("week");

  const { data: businesses } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });
  const businessId = businesses?.[0]?.id;

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/dashboard/businesses/${businessId}/analytics`, { period, granularity }],
    enabled: !!businessId,
  });

  const { data: reviews } = useQuery<ReviewsResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/reviews`],
    enabled: !!businessId,
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

  const buckets = analytics?.buckets ?? [];
  const services = analytics?.serviceBreakdown ?? [];
  const bestSlot = [...(analytics?.popularTimes ?? [])].sort((a, b) => b.count - a.count)[0];
  const bestService = services[0];
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const popularTimesData = (analytics?.popularTimes ?? []).reduce<Record<string, { hours: { hour: number; percentage: number }[] }>>(
    (acc, cell) => {
      const key = String(cell.day);
      acc[key] = acc[key] ?? { hours: [] };
      acc[key].hours.push({ hour: cell.hour, percentage: cell.popularity });
      return acc;
    },
    {},
  );

  const funnel = [
    { label: "Vistas del micrositio", value: analytics?.views ?? 0, icon: Eye, color: "text-blue-600" },
    { label: "Clics en WhatsApp", value: analytics?.whatsappClicks ?? 0, icon: MessageCircle, color: "text-green-600" },
    { label: "Clics en reservar", value: analytics?.bookClicks ?? 0, icon: MousePointerClick, color: "text-amber-600" },
    { label: "Reservas creadas", value: analytics?.appointmentsCreatedInPeriod ?? 0, icon: Calendar, color: "text-red-600" },
    { label: "Citas completadas", value: analytics?.completedAppointments ?? 0, icon: Target, color: "text-teal-700" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics y Reportes</h1>
            <p className="text-gray-600">
              Todos los números salen de tus citas y de las visitas reales a tu micrositio.
            </p>
            {analytics?.period && (
              <p className="text-xs text-muted-foreground mt-1">
                Período: {analytics.period.from} → {analytics.period.to} · comparado con{" "}
                {analytics.period.previousFrom} → {analytics.period.previousTo}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={granularity} onValueChange={(value) => setGranularity(value as "day" | "week" | "month")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por día</SelectItem>
                <SelectItem value="week">Por semana</SelectItem>
                <SelectItem value="month">Por mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <Kpi label="Facturado" value={formatMoney(analytics?.revenue ?? 0)} hint="Citas completadas por fecha de servicio" icon={DollarSign}>
            <Growth value={analytics?.revenueGrowth ?? null} />
          </Kpi>
          <Kpi label="Cobrado" value={formatMoney(analytics?.collected ?? 0)} hint="Pagos aprobados en el período" icon={Percent}>
            <span className="text-xs text-muted-foreground">Por cobrar: {formatMoney(analytics?.receivable ?? 0)}</span>
          </Kpi>
          <Kpi label="Ticket promedio" value={formatMoney(analytics?.averageAppointmentValue ?? 0)} hint="Facturado / citas completadas" icon={TrendingUp}>
            <span className="text-xs text-muted-foreground">Duración media: {(analytics?.averageDurationMinutes ?? 0).toFixed(0)} min</span>
          </Kpi>
          <Kpi label="Citas completadas" value={String(analytics?.completedAppointments ?? 0)} icon={Calendar}>
            <Growth value={analytics?.completedGrowth ?? null} />
          </Kpi>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <Kpi label="Citas del período" value={String(analytics?.appointmentsInPeriod ?? 0)} hint={`${analytics?.appointmentsCreatedInPeriod ?? 0} reservadas online`} icon={Calendar} />
          <Kpi label="Ocupación" value={formatPct(analytics?.occupancyRate)} hint="Minutos reservados / horas de atención" icon={Target}>
            <Badge className={((analytics?.occupancyRate ?? 0) >= 70 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
              {(analytics?.occupancyRate ?? 0) >= 70 ? "Buena demanda" : "Espacio para crecer"}
            </Badge>
          </Kpi>
          <Kpi label="Cancelaciones" value={formatPct(analytics?.cancelRate)} hint={`${analytics?.cancelledInPeriod ?? 0} canceladas`} icon={Clock}>
            <span className="text-xs text-muted-foreground">
              No-show: {formatPct(analytics?.noShowRate)} ({analytics?.noShowInPeriod ?? 0})
            </span>
          </Kpi>
          <Kpi label="Retención" value={formatPct(analytics?.retentionRate)} hint={`${analytics?.returningClients ?? 0} de ${analytics?.totalClients ?? 0} clientes volvieron`} icon={Users}>
            <span className="text-xs text-muted-foreground">Nuevos: {analytics?.newClients ?? 0}</span>
          </Kpi>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Facturación por período
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fecha de servicio · {analytics?.granularity === "day" ? "por día" : analytics?.granularity === "month" ? "por mes" : "por semana"}
              </p>
            </CardHeader>
            <CardContent>
              {buckets.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sin datos en este período</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={buckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? formatMoney(value) : value,
                        name === "revenue" ? "Facturado" : "Canceladas",
                      ]}
                      labelFormatter={(label) => `Período ${label}`}
                    />
                    <Bar dataKey="revenue" fill="#C13A2E" radius={[6, 6, 0, 0]} name="revenue" />
                    <Bar dataKey="cancelled" fill="#E5C9A8" radius={[6, 6, 0, 0]} name="cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Embudo del micrositio
              </CardTitle>
              <p className="text-sm text-muted-foreground">Vistas → contacto → reserva → cita completada</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((step, index) => (
                  <div key={step.label} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center">{index + 1}</span>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                      <span className="text-sm">{step.label}</span>
                    </div>
                    <span className="font-semibold">{step.value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Vista → reserva</p>
                  <p className="font-bold">{formatPct(analytics?.viewToBookingRate)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Clic reservar → reserva</p>
                  <p className="font-bold">{formatPct(analytics?.clickToBookingRate)}</p>
                </div>
              </div>
              {analytics?.sourceBreakdown && analytics.sourceBreakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Origen de las visitas</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.sourceBreakdown.slice(0, 5).map((source) => (
                      <Badge key={source.source} variant="secondary">{source.source}: {source.count}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Visitas día por día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(analytics?.trafficSeries ?? []).length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  Aún no hay visitas registradas en este período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics?.trafficSeries ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#3B6EA5" strokeWidth={2} dot={false} name="Vistas" />
                    <Line type="monotone" dataKey="bookClicks" stroke="#C13A2E" strokeWidth={2} dot={false} name="Clic reservar" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Horarios con más demanda
              </CardTitle>
              <p className="text-sm text-muted-foreground">Últimos 120 días de citas reales</p>
            </CardHeader>
            <CardContent>
              {Object.keys(popularTimesData).length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  Sin citas suficientes para calcular la demanda
                </div>
              ) : (
                <PopularTimes data={popularTimesData} />
              )}
            </CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Rendimiento de servicios</CardTitle>
              <p className="text-sm text-muted-foreground">Citas y facturación del período seleccionado</p>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">Crea servicios para ver su rendimiento.</p>
              ) : (
                <div className="space-y-3">
                  {services.slice(0, 8).map((service, index) => (
                    <div key={service.serviceId} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.appointments} citas · {service.completed} completadas · {formatMoney(service.revenue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{service.share.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">del total</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Reputación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{(reviews?.stats.averageRating ?? 0).toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">
                  {reviews?.stats.approved ?? 0} reseñas publicadas de {reviews?.stats.total ?? 0}
                </p>
              </div>
              {(reviews?.stats.pending ?? 0) > 0 && (
                <Badge className="bg-amber-100 text-amber-800">{reviews?.stats.pending} por moderar</Badge>
              )}
              <div className="text-sm text-muted-foreground">
                Respuestas del negocio: {formatPct(reviews?.stats.replyRate)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Qué hacer con estos datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">Día más solicitado</h4>
                <p className="text-blue-800 text-sm">
                  {bestSlot
                    ? `${dayNames[bestSlot.day]} a las ${String(bestSlot.hour).padStart(2, "0")}:00 concentra la mayor demanda (${bestSlot.count} citas).`
                    : "Aún no hay suficientes citas para identificar tu día más fuerte."}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-1">Servicio estrella</h4>
                <p className="text-green-800 text-sm">
                  {bestService && bestService.appointments > 0
                    ? `${bestService.name} lidera con ${bestService.appointments} citas y ${formatMoney(bestService.revenue)} facturados.`
                    : "Sin datos de servicios todavía."}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-1">Retención</h4>
                <p className="text-purple-800 text-sm">
                  {(analytics?.retentionRate ?? 0) > 0
                    ? `${formatPct(analytics?.retentionRate)} de tus clientes atendidos volvieron. Los que no regresan son tu mejor oportunidad de campaña.`
                    : "Cuando tengas clientes recurrentes verás aquí su porcentaje real."}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-1">Riesgo de ausencias</h4>
                <p className="text-orange-800 text-sm">
                  No-show: {formatPct(analytics?.noShowRate)} · Cancelaciones: {formatPct(analytics?.cancelRate)}.
                  {(analytics?.noShowRate ?? 0) > 10
                    ? " Considera pedir un anticipo al reservar."
                    : " Tus recordatorios automáticos están ayudando."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

