import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  HeartHandshake,
  ListOrdered,
  Megaphone,
  MessageCircle,
  Plus,
  QrCode,
  Scissors,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import ChairModeDialog from "@/components/chair-mode-dialog";
import CashEntryDialog from "@/components/cash-entry-dialog";
import FinishServiceDialog from "@/components/finish-service-dialog";
import QueueQrDialog from "@/components/queue-qr-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  deskRequest,
  formatLimaTime,
  formatPEN,
  METHOD_LABELS,
  QUEUE_STATUS_LABELS,
  STATUS_LABELS,
  type DeskAppointment,
  type DeskPromoListResponse,
  type DeskQueueResponse,
  type DeskSettings,
  type DeskTodayResponse,
  type DeskWaitlistResponse,
  type DeskLoyaltyResponse,
  type RetentionResponse,
} from "@/lib/desk-api";

interface DashboardBusiness {
  id: number;
  name: string;
}

const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  if (status === "in_progress") return "default";
  if (status === "completed") return "secondary";
  if (status === "cancelled" || status === "no_show") return "destructive";
  return "outline";
};

const formatShortDate = (iso: string): string => {
  const [, month, day] = iso.split("-");
  return day && month ? `${day}/${month}` : iso;
};

/**
 * Mobile-first home for walk-in businesses: seat a client, finish + collect,
 * and see today's cash — no calendar required.
 */
export default function Hoy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chairOpen, setChairOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [finishTarget, setFinishTarget] = useState<DeskAppointment | null>(null);

  const { data: businesses, isLoading: businessesLoading } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });

  const businessId = businesses?.[0]?.id;

  const { data, isLoading } = useQuery<DeskTodayResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/today`],
    enabled: Boolean(businessId),
    refetchInterval: 30_000,
  });

  const { data: queue } = useQuery<DeskQueueResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/queue`],
    enabled: Boolean(businessId),
    refetchInterval: 20_000,
  });

  const { data: retention } = useQuery<RetentionResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/retention`],
    enabled: Boolean(businessId),
    refetchInterval: 5 * 60_000,
  });

  const { data: promosData } = useQuery<DeskPromoListResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/promos`],
    enabled: Boolean(businessId),
    refetchInterval: 60_000,
  });

  const { data: waitlistData } = useQuery<DeskWaitlistResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/waitlist`],
    enabled: Boolean(businessId),
    refetchInterval: 60_000,
  });

  const { data: loyaltyData } = useQuery<DeskLoyaltyResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/loyalty`],
    enabled: Boolean(businessId),
    refetchInterval: 60_000,
  });

  const invalidateDesk = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/queue`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/retention`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/promos`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/waitlist`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/loyalty`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/appointments`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/cashflow/summary`] });
  };

  const seatMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/seat`, "POST", {}),
    onSuccess: () => {
      invalidateDesk();
      toast({ title: "Cliente sentado", description: "La silla quedó ocupada." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo sentar al cliente",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const notifyQueueTicket = useMutation({
    mutationFn: (ticketId: number) =>
      deskRequest<{ whatsappUrl: string | null; sent?: boolean; skipped?: boolean }>(
        `/api/dashboard/businesses/${businessId}/queue/tickets/${ticketId}/call`,
        "POST",
        {},
      ),
    onSuccess: (result) => {
      invalidateDesk();
      if (result?.sent) {
        toast({
          title: "Aviso enviado por WhatsApp",
          description: "El cliente recibió el mensaje automático de la cola.",
        });
        return;
      }
      if (result?.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener");
      } else {
        toast({
          title: "Turno marcado como avisado",
          description: "El cliente no dejó celular; avísale en persona.",
        });
      }
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo avisar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const seatQueueTicket = useMutation({
    mutationFn: ({ ticketId, force }: { ticketId: number; force?: boolean }) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/queue/tickets/${ticketId}/seat`, "POST", {
        force: Boolean(force),
      }),
    onSuccess: () => {
      invalidateDesk();
      toast({ title: "Cliente sentado", description: "El turno pasó a la silla." });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo sentar",
        description:
          error?.status === 409
            ? "Termina el servicio actual primero (la silla está ocupada)."
            : error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const skipQueueTicket = useMutation({
    mutationFn: (ticketId: number) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/queue/tickets/${ticketId}/skip`, "POST", {}),
    onSuccess: () => {
      invalidateDesk();
      toast({ title: "Turno quitado de la cola" });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo quitar el turno",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const depositAction = useMutation({
    mutationFn: ({
      appointmentId,
      status,
      method,
    }: {
      appointmentId: number;
      status: "paid" | "waived" | "released";
      method?: "cash" | "yape" | "plin" | "card" | "transfer";
    }) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/deposit`, "PATCH", {
        status,
        method,
      }),
    onSuccess: (_result, variables) => {
      invalidateDesk();
      toast({
        title:
          variables.status === "paid"
            ? "Depósito registrado"
            : variables.status === "waived"
              ? "Depósito exonerado"
              : "Horario liberado",
        description:
          variables.status === "paid"
            ? "La cita quedó confirmada y el monto se descontará del servicio."
            : variables.status === "waived"
              ? "La cita quedó confirmada sin depósito."
              : "El turno se canceló y el horario vuelve a estar disponible.",
      });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo actualizar el depósito",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const removeWaitlistEntry = useMutation({
    mutationFn: (entryId: number) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/waitlist/${entryId}`, "DELETE"),
    onSuccess: () => {
      invalidateDesk();
      toast({ title: "Cliente quitado de la lista" });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo quitar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const toggleQueueOpen = useMutation({
    mutationFn: (open: boolean) =>
      deskRequest<DeskSettings>(
        `/api/dashboard/businesses/${businessId}/desk-settings/queue-status`,
        "PATCH",
        { open },
      ),
    onSuccess: (settings) => {
      invalidateDesk();
      toast({
        title: settings.queueOpen ? "Cola abierta" : "Cola cerrada",
        description: settings.queueOpen
          ? "Los clientes ya pueden sacar turno."
          : "No entrarán turnos nuevos hasta que la abras.",
      });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo cambiar la cola",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const deleteTransaction = useMutation({
    mutationFn: (transactionId: number) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/cashflow/transactions/${transactionId}`, "DELETE"),
    onSuccess: () => {
      invalidateDesk();
      toast({ title: "Movimiento eliminado" });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo eliminar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  if (businessesLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!businessId) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md p-6 text-center">
          <h1 className="text-xl font-semibold">Primero crea tu negocio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Necesitas un negocio para registrar clientes y cobros del día.
          </p>
          <Button asChild className="mt-4">
            <a href="/dashboard/create-business">Crear negocio</a>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  const pendingAppointments = data.appointments.filter(
    (appointment) => !["cancelled", "no_show"].includes(appointment.status),
  );
  const pendingDeposits = data.appointments.filter(
    (appointment) => appointment.depositStatus === "pending" && appointment.status === "pending",
  );
  const pendingDepositTotal = pendingDeposits.reduce(
    (sum, appointment) => sum + Number(appointment.depositAmount ?? 0),
    0,
  );
  const waitlistEntries = waitlistData?.entries ?? [];
  const loyaltyCards = loyaltyData?.cards ?? [];
  const activePromos = (promosData?.promos ?? []).filter((promo) => promo.state === "open");

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold theme-text-primary">Hoy</h1>
            <p className="text-sm theme-text-secondary">
              {businesses?.[0]?.name} · son las {data.now} (hora Lima)
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm theme-text-secondary">
            <Clock className="h-4 w-4" />
            {data.stats.waiting} en espera · {data.stats.completed} atendidos
          </div>
        </div>

        {/* Cash + chair actions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
                <Wallet className="h-4 w-4" />
                Caja de hoy
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setCashOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Ingreso
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-emerald-700">{formatPEN(data.cash.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.cash.count} cobros · ayer {formatPEN(data.previousDayTotal)}
                {data.cash.tips > 0 ? ` · propinas ${formatPEN(data.cash.tips)}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.cash.byMethod.map((entry) => (
                  <span
                    key={entry.method}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      entry.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {entry.label}: {formatPEN(entry.total)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              className="h-20 w-full text-lg font-bold shadow-lg"
              size="lg"
              onClick={() => setChairOpen(true)}
            >
              <Scissors className="mr-2 h-6 w-6" />
              Sentar cliente ahora
            </Button>

            {data.chair.busy ? (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Clock className="h-6 w-6 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                      Silla ocupada · libre ~{data.chair.until}
                    </p>
                    <p className="truncate text-xs text-amber-800">
                      {data.chair.clientName} — {data.chair.serviceName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-400 bg-white"
                    onClick={() =>
                      setFinishTarget(
                        pendingAppointments.find((appointment) => appointment.id === data.chair.appointmentId) ??
                          null,
                      )
                    }
                  >
                    Cobrar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Silla libre. Atiende al siguiente cliente.
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2">
                <p className="text-lg font-bold">{data.stats.walkIns}</p>
                <p className="text-[11px] text-muted-foreground">walk-ins</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-lg font-bold">{data.stats.completed}</p>
                <p className="text-[11px] text-muted-foreground">atendidos</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-lg font-bold">
                  {formatPEN(data.cash.total / (data.cash.count || 1))}
                </p>
                <p className="text-[11px] text-muted-foreground">ticket medio</p>
              </div>
            </div>
          </div>
        </div>


        {/* Virtual queue */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="h-4 w-4" />
              Cola virtual
              {queue && <Badge variant="secondary">{queue.waitingCount}</Badge>}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {queue && (
                <span className="text-xs text-muted-foreground">
                  próximo espera ~{queue.estimatedWaitMinutes} min
                </span>
              )}
              {queue?.settings.queueEnabled && (
                <Button
                  size="sm"
                  variant={queue.settings.queueOpen ? "outline" : "default"}
                  onClick={() => toggleQueueOpen.mutate(!queue.settings.queueOpen)}
                  disabled={toggleQueueOpen.isPending}
                >
                  {queue.settings.queueOpen ? "Cerrar cola" : "Abrir cola"}
                </Button>
              )}
              <Button size="sm" variant="ghost" asChild>
                <a href="/dashboard/configuracion?tab=operacion" title="Configurar mostrador y cola">
                  <Settings2 className="h-4 w-4" />
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
                <QrCode className="mr-1 h-4 w-4" />
                Mi QR
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            {queue && !queue.settings.queueEnabled && (
              <div className="py-3 text-sm text-amber-700">
                Cola virtual desactivada. Actívala en Configuración → Operación cuando quieras usarla.
              </div>
            )}
            {queue && queue.settings.queueEnabled && !queue.settings.queueOpen && (
              <div className="py-3 text-sm text-amber-700">
                Cola cerrada: los clientes no pueden tomar turnos nuevos.
              </div>
            )}
            {!queue || queue.tickets.length === 0 ? (
              <div className="py-4 text-sm text-muted-foreground">
                Nadie en la cola. Pega tu QR en la puerta para que los clientes tomen turno
                sin esperar adentro.
              </div>
            ) : (
              queue.tickets.map((ticket) => (
                <div key={ticket.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
                    {ticket.position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ticket.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.serviceName} ·{" "}
                      {ticket.etaMinutes && ticket.etaMinutes > 0
                        ? `~${ticket.etaMinutes} min`
                        : "ahora"}{" "}
                      · {formatLimaTime(ticket.joinedAt)}
                    </p>
                    <Badge
                      variant={ticket.status === "notified" ? "default" : "outline"}
                      className="mt-1 text-[10px]"
                    >
                      {QUEUE_STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => notifyQueueTicket.mutate(ticket.id)}
                      disabled={notifyQueueTicket.isPending}
                      title="Avisar por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Llamar</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const force = data.chair.busy
                          ? window.confirm("La silla está ocupada. ¿Sentar igual?")
                          : false;
                        if (data.chair.busy && !force) return;
                        seatQueueTicket.mutate({ ticketId: ticket.id, force });
                      }}
                      disabled={seatQueueTicket.isPending}
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Sentar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Quitar de la cola"
                      onClick={() => {
                        if (window.confirm(`¿Quitar a ${ticket.name} de la cola?`)) {
                          skipQueueTicket.mutate(ticket.id);
                        }
                      }}
                      disabled={skipQueueTicket.isPending}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending deposits */}
        {pendingDeposits.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                <ShieldCheck className="h-4 w-4" />
                Depósitos por cobrar
                <Badge variant="secondary">{pendingDeposits.length}</Badge>
              </CardTitle>
              <span className="text-sm font-semibold text-amber-900">
                {formatPEN(pendingDepositTotal)}
              </span>
            </CardHeader>
            <CardContent className="divide-y divide-amber-200/60">
              {pendingDeposits.map((appointment) => (
                <div key={appointment.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{appointment.clientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {appointment.time} · {appointment.serviceName} · S/{" "}
                      {Number(appointment.depositAmount ?? 0).toFixed(2)}
                      {appointment.depositExpiresAt
                        ? ` · vence ${formatLimaTime(appointment.depositExpiresAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() =>
                        depositAction.mutate({
                          appointmentId: appointment.id,
                          status: "paid",
                          method: "yape",
                        })
                      }
                      disabled={depositAction.isPending}
                    >
                      Yape
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        depositAction.mutate({
                          appointmentId: appointment.id,
                          status: "paid",
                          method: "cash",
                        })
                      }
                      disabled={depositAction.isPending}
                    >
                      Efectivo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        depositAction.mutate({ appointmentId: appointment.id, status: "waived" })
                      }
                      disabled={depositAction.isPending}
                    >
                      Exonerar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Liberar horario"
                      onClick={() => {
                        if (window.confirm(`¿Liberar el horario de ${appointment.clientName}?`)) {
                          depositAction.mutate({ appointmentId: appointment.id, status: "released" });
                        }
                      }}
                      disabled={depositAction.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Cancellation waitlist */}
        {waitlistEntries.length > 0 && (
          <Card className="border-sky-200 bg-sky-50/50">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-sky-900">
                <Users className="h-4 w-4" />
                Lista de espera
                <Badge variant="secondary">{waitlistData?.count ?? 0}</Badge>
              </CardTitle>
              <a className="text-xs underline" href="/dashboard/settings">
                Configurar
              </a>
            </CardHeader>
            <CardContent className="divide-y divide-sky-200/60">
              {waitlistEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.serviceName} · {entry.date}
                      {entry.status === "notified" && entry.offeredTime
                        ? ` · avisado para ${entry.offeredTime}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={entry.status === "notified" ? "default" : "outline"}>
                    {entry.status === "notified" ? "Avisado" : "En espera"}
                  </Badge>
                  {entry.phone && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="WhatsApp" asChild>
                      <a
                        href={`https://wa.me/${entry.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Quitar de la lista"
                    onClick={() => {
                      if (window.confirm(`¿Quitar a ${entry.name} de la lista?`)) {
                        removeWaitlistEntry.mutate(entry.id);
                      }
                    }}
                    disabled={removeWaitlistEntry.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {waitlistEntries.length > 5 && (
                <p className="pt-2 text-xs text-muted-foreground">
                  +{waitlistEntries.length - 5} más en la lista.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loyalty cards */}
        {loyaltyData?.enabled && loyaltyCards.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">Tarjetas de fidelidad</p>
                  <p className="text-xs text-muted-foreground">
                    {loyaltyData.count} tarjetas · {loyaltyData.rewardsReady} premios listos
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/loyalty">Ver tarjetas</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dead-hour promos */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              Promos de horas muertas
              <Badge variant="secondary">{activePromos.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href="/dashboard/promos">Gestionar</a>
              </Button>
              <Button size="sm" asChild>
                <a href="/dashboard/promos">
                  <Plus className="mr-1 h-4 w-4" />
                  Nueva
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            {promosData && !promosData.promosEnabled ? (
              <p className="py-3 text-sm text-amber-700">
                Promociones desactivadas. Actívalas en Configuración → Operación.
              </p>
            ) : activePromos.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                No hay promos activas. Llena una hora muerta con un precio especial y compártela
                por WhatsApp.
              </p>
            ) : (
              activePromos.slice(0, 3).map((promo) => (
                <div key={promo.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{promo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPEN(promo.price)} · {promo.date} {promo.startTime}–{promo.endTime}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {promo.claimed}/{promo.capacity} cupos
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Retention: clients past the configured window */}
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartHandshake className="h-4 w-4" />
              Clientes para recuperar
              {retention && <Badge variant="secondary">{retention.count}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              {retention && (
                <span className="text-xs text-muted-foreground">
                  sin venir hace más de {retention.days} días
                </span>
              )}
              <Button size="sm" variant="ghost" asChild>
                <a href="/dashboard/configuracion?tab=operacion" title="Configurar recordatorios">
                  <Settings2 className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            {!retention || retention.clients.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Nadie pendiente. Cuando un cliente deje de venir, aparecerá aquí con un
                mensaje listo para WhatsApp.
              </p>
            ) : (
              <>
                {retention.clients.slice(0, 5).map((client) => (
                  <div key={client.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Hace {client.daysSince} días · última visita {formatShortDate(client.lastVisitDate)} ·{" "}
                        {client.visits} {client.visits === 1 ? "visita" : "visitas"} ·{" "}
                        {formatPEN(client.totalSpent)}
                      </p>
                    </div>
                    {client.whatsappUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={client.whatsappUrl} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-1 h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin celular</span>
                    )}
                  </div>
                ))}
                {retention.count > 5 && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    y {retention.count - 5} más en Clientes.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Agenda + movements */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Agenda de hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {pendingAppointments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Todavía no hay clientes hoy. Usa “Sentar cliente ahora”.
                </p>
              ) : (
                pendingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center gap-3 py-3">
                    <div className="w-12 shrink-0 text-center">
                      <p className="text-sm font-semibold">{appointment.time}</p>
                      <p className="text-[10px] text-muted-foreground">{appointment.endTime}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{appointment.clientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.serviceName}
                        {appointment.price ? ` · ${formatPEN(appointment.price)}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant={statusVariant(appointment.status)} className="text-[10px]">
                          {STATUS_LABELS[appointment.status] ?? appointment.status}
                        </Badge>
                        {appointment.source === "walk_in" && (
                          <Badge variant="outline" className="text-[10px]">
                            Walk-in
                          </Badge>
                        )}
                        {appointment.packageUsesRemaining ? (
                          <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
                            Bono · {appointment.packageUsesRemaining}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {appointment.status === "in_progress" ? (
                      <Button size="sm" onClick={() => setFinishTarget(appointment)}>
                        Cobrar
                      </Button>
                    ) : ["pending", "confirmed"].includes(appointment.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => seatMutation.mutate(appointment.id)}
                        disabled={seatMutation.isPending}
                      >
                        Sentar
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ) : appointment.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Movimientos de hoy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.cash.transactions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aún no registraste cobros hoy.
                </p>
              ) : (
                data.cash.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {transaction.serviceName || "Ingreso"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {METHOD_LABELS[transaction.method] ?? transaction.method} ·{" "}
                        {formatLimaTime(transaction.occurredAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatPEN(transaction.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => deleteTransaction.mutate(transaction.id)}
                      disabled={deleteTransaction.isPending}
                      aria-label="Eliminar movimiento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <QueueQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        businessName={businesses?.[0]?.name ?? "tu negocio"}
        qrPath={queue?.qrPath ?? `/api/public/queue/${businessId}/qr`}
        sharePath={queue?.sharePath ?? `/q/${businessId}`}
      />
      <ChairModeDialog
        open={chairOpen}
        onOpenChange={setChairOpen}
        businessId={businessId}
        services={data.services}
        chair={data.chair}
      />
      <FinishServiceDialog
        open={Boolean(finishTarget)}
        onOpenChange={(open) => {
          if (!open) setFinishTarget(null);
        }}
        businessId={businessId}
        appointment={finishTarget}
        paymentMethods={data.deskSettings?.paymentMethods}
        allowTips={data.deskSettings?.allowTips ?? true}
      />
      <CashEntryDialog
        open={cashOpen}
        onOpenChange={setCashOpen}
        businessId={businessId}
        services={data.services}
        paymentMethods={data.deskSettings?.paymentMethods}
      />
    </DashboardLayout>
  );
}
