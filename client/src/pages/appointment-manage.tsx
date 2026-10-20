import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Calendar, Clock, MapPin, Phone, RefreshCw, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicPageShell } from "@/components/public-page-header";
import { publicJson } from "@/lib/public-api";

interface AppointmentPayload {
  appointment: {
    id: number;
    date: string;
    time: string;
    duration: number;
    status: string;
    price: string | null;
    notes: string | null;
  };
  deposit: {
    required: boolean;
    amount: number;
    status: string | null;
    expiresAt: string | null;
    paidAt: string | null;
    policy: string;
    checkoutAvailable: boolean;
  } | null;
  client: { name: string; email: string | null; phone: string | null } | null;
  service: { id: number; name: string; duration: number | null; price: string | null } | null;
  business: { id: number; name: string; phone: string | null; email: string | null } | null;
  canManage: boolean;
}

const DEPOSIT_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  waived: "Exonerado",
  refunded: "Devuelto",
  expired: "Plazo vencido",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  rescheduled: "Reprogramada",
  no_show: "No asistió",
};

export default function AppointmentManagePage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [isPayingDeposit, setIsPayingDeposit] = useState(false);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("deposit");
    if (result === "success") {
      setMessage({ type: "ok", text: "Pago recibido. Estamos confirmando tu cita." });
    } else if (result === "failure") {
      setMessage({ type: "error", text: "El pago no se completó. Puedes intentarlo de nuevo." });
    } else if (result === "pending") {
      setMessage({ type: "ok", text: "Pago pendiente de confirmación por MercadoPago." });
    }
  }, []);

  const { data, isLoading, error } = useQuery<AppointmentPayload>({
    queryKey: [`/api/public/appointments/${token}`],
    enabled: Boolean(token),
  });

  const { data: slots } = useQuery<Array<{ time: string; available: boolean }>>({
    queryKey: [`/api/appointments/availability/${data?.business?.id}`, newDate, data?.service?.id],
    enabled: Boolean(data?.business?.id && data?.service?.id && newDate),
    queryFn: async () => {
      const response = await fetch(
        `/api/appointments/availability/${data?.business?.id}?date=${newDate}&serviceId=${data?.service?.id}`,
      );
      return response.json();
    },
  });

  const availableSlots = useMemo(() => (slots ?? []).filter((slot) => slot.available), [slots]);

  const cancelAppointment = async () => {
    if (!window.confirm("¿Seguro que quieres cancelar tu cita?")) return;
    setIsBusy(true);
    try {
      const response = await fetch(`/api/public/appointments/${token}/cancel`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "No se pudo cancelar");
      setMessage({ type: "ok", text: payload?.message || "Tu cita fue cancelada" });
      queryClient.invalidateQueries({ queryKey: [`/api/public/appointments/${token}`] });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Error cancelando la cita" });
    } finally {
      setIsBusy(false);
    }
  };

  const rescheduleAppointment = async () => {
    if (!newDate || !newTime) {
      setMessage({ type: "error", text: "Elige una fecha y una hora" });
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch(`/api/public/appointments/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, time: newTime }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "No se pudo reprogramar");
      setMessage({ type: "ok", text: payload?.message || "Tu cita fue reprogramada" });
      setNewDate("");
      setNewTime("");
      queryClient.invalidateQueries({ queryKey: [`/api/public/appointments/${token}`] });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Error reprogramando la cita" });
    } finally {
      setIsBusy(false);
    }
  };

  const payDeposit = async () => {
    setIsPayingDeposit(true);
    setDepositMessage(null);
    try {
      const result = await publicJson<{ checkoutUrl: string }>(
        `/api/public/appointments/${token}/deposit`,
        "POST",
        {},
      );
      window.location.href = result.checkoutUrl;
    } catch (error: any) {
      setDepositMessage(error?.message ?? "No se pudo iniciar el pago del depósito");
    } finally {
      setIsPayingDeposit(false);
    }
  };

  if (isLoading) {
    return (
      <PublicPageShell>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </PublicPageShell>
    );
  }

  if (error || !data) {
    return (
      <PublicPageShell>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-red-500" />
            <h1 className="text-xl font-bold">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground">
              No encontramos esta cita. Puede haber sido eliminada o el enlace está incompleto.
            </p>
            <Button onClick={() => (window.location.href = "/")} className="w-full">Volver al inicio</Button>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }
  const { appointment, business, service, client, canManage, deposit } = data;


  return (
    <PublicPageShell businessName={business?.name} phone={business?.phone}>
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-600" />
              {business?.name || "Tu cita"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge>{STATUS_LABELS[appointment.status] || appointment.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Servicio</span>
              <span className="font-medium">{service?.name || "Servicio"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-4 h-4" /> Fecha</span>
              <span className="font-medium">{appointment.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" /> Hora</span>
              <span className="font-medium">{appointment.time} · {appointment.duration} min</span>
            </div>
            {client?.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">A nombre de</span>
                <span className="font-medium">{client.name}</span>
              </div>
            )}
            {business?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-4 h-4" /> Negocio</span>
                <a className="font-medium hover:underline" href={`tel:${business.phone}`}>{business.phone}</a>
              </div>
            )}
          </CardContent>
        </Card>

        {deposit && (
          <Card
            className={
              deposit.status === "paid"
                ? "border-emerald-200 bg-emerald-50/60"
                : deposit.status === "expired"
                  ? "border-red-200 bg-red-50/60"
                  : "border-amber-200 bg-amber-50/60"
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5" />
                Depósito de reserva
                <Badge variant={deposit.status === "paid" ? "default" : "secondary"}>
                  {DEPOSIT_LABELS[deposit.status ?? ""] ?? deposit.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="text-lg font-bold">S/ {deposit.amount.toFixed(2)}</span>
              </div>
              <p className="text-muted-foreground">{deposit.policy}</p>

              {deposit.status === "pending" && canManage && (
                <>
                  {deposit.checkoutAvailable ? (
                    <Button className="w-full" onClick={payDeposit} disabled={isPayingDeposit}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {isPayingDeposit ? "Abriendo MercadoPago…" : "Pagar depósito online"}
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-white/70 p-3 text-amber-900">
                      El pago online no está disponible ahora. Paga en el local o coordina con el
                      negocio para confirmar tu cita.
                    </p>
                  )}
                  {business?.phone && (
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={`https://wa.me/${business.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hola, quiero pagar el depósito de mi cita del ${appointment.date} a las ${appointment.time}.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Coordinar por WhatsApp
                      </a>
                    </Button>
                  )}
                  {deposit.expiresAt && (
                    <p className="text-xs text-amber-800">
                      Paga antes de {new Date(deposit.expiresAt).toLocaleString("es-PE", { timeZone: "America/Lima" })} para no perder el horario.
                    </p>
                  )}
                </>
              )}

              {deposit.status === "paid" && (
                <p className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> Depósito recibido. Se descuenta del servicio.
                </p>
              )}
              {deposit.status === "expired" && (
                <p className="text-red-800">
                  El plazo para el depósito venció y el horario fue liberado. Puedes reservar de nuevo.
                </p>
              )}
              {depositMessage && <p className="text-red-700">{depositMessage}</p>}
            </CardContent>
          </Card>
        )}

        {message && (
          <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${message.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            <CheckCircle2 className="w-4 h-4" /> {message.text}
          </div>
        )}

        {canManage && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Agregar a tu calendario</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const start = `${appointment.date.replace(/-/g, "")}T${appointment.time.replace(":", "")}00`;
                  const endDate = new Date(`${appointment.date}T${appointment.time}:00`);
                  endDate.setMinutes(endDate.getMinutes() + (appointment.duration || 30));
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
                  const params = new URLSearchParams({
                    action: "TEMPLATE",
                    text: `${service?.name || "Cita"} — ${business?.name || "MiCita"}`,
                    dates: `${start}/${end}`,
                    details: `Cita reservada con MiCita${appointment.notes ? `\n${appointment.notes}` : ""}`,
                    location: business?.name || "",
                  });
                  return (
                    <Button asChild variant="outline" className="w-full">
                      <a href={`https://calendar.google.com/calendar/render?${params.toString()}`} target="_blank" rel="noopener noreferrer">
                        <Calendar className="w-4 h-4 mr-2" /> Añadir a Google Calendar
                      </a>
                    </Button>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Reprogramar</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input type="date" value={newDate} onChange={(event) => { setNewDate(event.target.value); setNewTime(""); }} />
                <Select value={newTime} onValueChange={setNewTime} disabled={!newDate}>
                  <SelectTrigger><SelectValue placeholder={newDate ? "Elige un horario" : "Primero elige la fecha"} /></SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot.time} value={slot.time}>{slot.time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={rescheduleAppointment} disabled={isBusy || !newDate || !newTime}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Confirmar nueva fecha
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Si no puedes asistir, cancela para liberar el horario.
                </p>
                <Button variant="outline" className="w-full text-red-600" onClick={cancelAppointment} disabled={isBusy}>
                  <XCircle className="w-4 h-4 mr-2" /> Cancelar mi cita
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> Gestionado con MiCita
        </p>
    </PublicPageShell>
  );
}


