import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Calendar, Clock, MapPin, Phone, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  client: { name: string; email: string | null; phone: string | null } | null;
  service: { id: number; name: string; duration: number | null; price: string | null } | null;
  business: { id: number; name: string; phone: string | null; email: string | null } | null;
  canManage: boolean;
}

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="w-12 h-12 mx-auto text-red-500" />
            <h1 className="text-xl font-bold">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground">
              No encontramos esta cita. Puede haber sido eliminada o el enlace está incompleto.
            </p>
            <Button onClick={() => (window.location.href = "/")} className="w-full">Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  const { appointment, business, service, client, canManage } = data;


  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-4">
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
      </div>
    </div>
  );
}


