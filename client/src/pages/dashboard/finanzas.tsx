
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingDown
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { apiFetch } from "@/lib/auth-api";
import { apiRequest } from "@/lib/queryClient";

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

interface DashboardBusiness {
  id: number;
  name: string;
  category?: string;
}

interface FinancialData {
  totalRevenue: number;
  pendingPayments: number;
  averageAppointmentValue: number;
  completedAppointments: number;
  collected?: number;
  receivable?: number;
  growth?: number | null;
  appointmentsCompletedGrowth?: number | null;
  occupancyRate?: number;
  cancelledInPeriod?: number;
  noShowInPeriod?: number;
  payments?: Array<{
    id: number;
    amount: number;
    status: string;
    currency?: string | null;
    method?: string | null;
    paidAt?: string | null;
    createdAt?: string | null;
  }>;
  monthlyData: Array<{ month: string; revenue: number; appointments: number }>;
  paymentStatusData: Array<{ name: string; value: number }>;
  recentTransactions: Array<{
    id: number;
    clientName?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    amount?: number;
    status?: string;
  }>;
}

export default function Finanzas() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");
  const [activeTab, setActiveTab] = useState("resumen");
  const [isExporting, setIsExporting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const queryClient = useQueryClient();

  const handleExport = async (dataset: "appointments" | "clients" | "revenue" | "reviews") => {
    const businessId = businesses?.[0]?.id;
    if (!businessId) return;
    setIsExporting(true);
    try {
      const response = await apiFetch(`/api/dashboard/businesses/${businessId}/export/${dataset}`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `micita-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businesses?.[0]?.id}/financials?period=${selectedPeriod}`] });
    await queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businesses?.[0]?.id}/analytics`] });
  };

  const handleSubscribe = async (plan: "premium" | "premium_plus") => {
    const businessId = businesses?.[0]?.id;
    if (!businessId) return;
    setIsSubscribing(true);
    try {
      const response = await apiRequest("POST", "/api/payments/subscribe", { businessId, plan });
      const data = await response.json();
      if (data?.initPoint) {
        window.location.href = data.initPoint;
      }
    } catch (error) {
      console.error("Subscribe error:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const { data: businesses, isLoading: businessesLoading } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });

  const businessId = businesses?.[0]?.id;

  const { data: financialData, isLoading: financialLoading } = useQuery<FinancialData>({
    queryKey: [`/api/dashboard/businesses/${businessId}/financials?period=${selectedPeriod}`],
    enabled: !!businessId,
  });

  const { data: analytics } = useQuery<Record<string, unknown>>({
    queryKey: [`/api/dashboard/businesses/${businessId}/analytics`],
    enabled: !!businessId,
  });

  // Billing data must be declared before any early return (hook order).
  const { data: paymentConfig } = useQuery<{
    configured: boolean;
    plans: Record<string, { amount: number; label: string }>;
  }>({ queryKey: ["/api/payments/config"] });

  const { data: subscriptionData } = useQuery<{ subscription: { plan?: string; status?: string; currentPeriodEnd?: string | null } | null }>({
    queryKey: [`/api/payments/subscription/${businessId}`],
    enabled: !!businessId,
  });

  // Cash-drawer totals logged from the mobile "Hoy" screen (Yape/Plin/efectivo).
  const { data: cashToday } = useQuery<{
    total: number;
    count: number;
    tips: number;
    byMethod: Array<{ method: string; label: string; total: number; count: number }>;
  }>({
    queryKey: [`/api/dashboard/businesses/${businessId}/cashflow/summary`],
    enabled: !!businessId,
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: BarChart },
    { id: 'ingresos', label: 'Ingresos', icon: TrendingUp },
    { id: 'pagos', label: 'Pagos', icon: CreditCard },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'plan', label: 'Mi plan', icon: CreditCard },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <div className="space-y-8">
            {/* Cash drawer logged from the mobile "Hoy" screen */}
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-emerald-700">Caja de hoy (Yape / Plin / efectivo)</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { window.location.href = "/dashboard/hoy"; }}>
                  Ir a Hoy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-6">
                  <div>
                    <p className="text-3xl font-bold text-emerald-700">
                      {formatCurrency(cashToday?.total ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cashToday?.count ?? 0} cobros registrados hoy
                      {cashToday?.tips ? ` · propinas ${formatCurrency(cashToday.tips)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cashToday?.byMethod ?? []).map((entry) => (
                      <span
                        key={entry.method}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          entry.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {entry.label}: {formatCurrency(entry.total)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialData?.totalRevenue || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className={`mt-2 flex items-center text-sm ${(financialData?.growth ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(financialData?.growth ?? 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {financialData?.growth === null || financialData?.growth === undefined
                      ? "Sin período anterior comparable"
                      : `${financialData.growth >= 0 ? "+" : ""}${financialData.growth.toFixed(1)}% vs período anterior`}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cobrado: {formatCurrency(financialData?.collected ?? 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(financialData?.pendingPayments || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
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
                        {formatCurrency(financialData?.averageAppointmentValue || 0)}
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
                        {financialData?.completedAppointments || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">Evolución de Ingresos</CardTitle>
                  <p className="text-sm text-gray-600">Ingresos mensuales de los últimos 12 meses</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialData?.monthlyData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Ingresos']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{ fill: '#8884d8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">Estado de Pagos</CardTitle>
                  <p className="text-sm text-gray-600">Distribución de ingresos por estado</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={financialData?.paymentStatusData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(financialData?.paymentStatusData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'ingresos':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={financialData?.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value as number), 'Ingresos']}
                    />
                    <Bar dataKey="revenue" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ingresos del Período</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialData?.totalRevenue || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Citas Completadas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {financialData?.completedAppointments || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ingreso Promedio</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(financialData?.averageAppointmentValue || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'pagos':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Pagos Completados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(financialData?.totalRevenue || 0)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {financialData?.completedAppointments || 0} citas completadas
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Pagos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">
                      {formatCurrency(financialData?.pendingPayments || 0)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Citas confirmadas y pendientes
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Estado de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={financialData?.paymentStatusData || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, count }) => `${name}: ${count} citas`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(financialData?.paymentStatusData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      case 'reportes':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transacciones Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {financialData?.recentTransactions && financialData.recentTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financialData.recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date} {transaction.time}</TableCell>
                          <TableCell>{transaction.clientName}</TableCell>
                          <TableCell>{transaction.serviceName}</TableCell>
                          <TableCell>{formatCurrency(transaction.amount ?? 0)}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                              {transaction.status === 'completed' ? 'Completado' : 'Pendiente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-8 w-8 mb-2" />
                    <p>No hay transacciones recientes</p>
                    <p className="text-sm">Las transacciones aparecerán cuando completes citas</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen del Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Total de Ingresos:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(financialData?.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Pagos Pendientes:</span>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(financialData?.pendingPayments || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Ingreso Promedio:</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(financialData?.averageAppointmentValue || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Citas Completadas:</span>
                      <span className="font-bold text-purple-600">
                        {financialData?.completedAppointments || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Período Seleccionado:</span>
                      <span className="font-medium text-gray-700">
                        {selectedPeriod === 'thisMonth' ? 'Este Mes' :
                         selectedPeriod === 'lastMonth' ? 'Mes Anterior' :
                         selectedPeriod === 'last3Months' ? 'Últimos 3 Meses' :
                         'Este Año'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'plan': {
        const subscription = subscriptionData?.subscription;
        const plans = paymentConfig?.plans ?? {
          premium: { amount: 59, label: "Plan Premium" },
          premium_plus: { amount: 129, label: "Plan Premium Plus" },
        };
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tu plan actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold capitalize">{subscription?.plan || "Gratis"}</p>
                <Badge variant={subscription?.status === "authorized" ? "default" : "secondary"}>
                  {subscription?.status || "sin suscripción"}
                </Badge>
                {subscription?.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renueva el {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-PE")}
                  </p>
                )}
                {!paymentConfig?.configured && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                    La pasarela de pagos aún no está configurada en este entorno.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(plans).map(([key, plan]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{plan.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-3xl font-bold">
                      S/ {plan.amount}
                      <span className="text-sm font-normal text-muted-foreground"> /mes</span>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Micrositio publicado y posicionado</li>
                      <li>• Reservas ilimitadas y recordatorios automáticos</li>
                      <li>• Analítica de tráfico y embudo</li>
                      <li>• Exportación de datos</li>
                    </ul>
                    <Button
                      className="w-full"
                      disabled={isSubscribing || !paymentConfig?.configured}
                      onClick={() => handleSubscribe(key as "premium" | "premium_plus")}
                    >
                      {isSubscribing ? "Redirigiendo…" : `Activar ${plan.label}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

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
              <Button variant="outline" onClick={() => handleExport("appointments")} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exportando…" : "Exportar"}
              </Button>
              <Button variant="outline" onClick={handleRefresh} title="Actualizar datos">
                <RefreshCw className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {financialLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </DashboardLayout>
  );
}
