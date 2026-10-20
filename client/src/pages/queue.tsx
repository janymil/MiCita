import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CheckCircle2, Clock, MapPin, MessageCircle, Users, XCircle } from "lucide-react";
import { MicitaLogo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatLimaTime, formatPEN } from "@/lib/desk-api";
import { publicJson } from "@/lib/public-api";

interface QueueBusiness {
  id: number;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  phone: string | null;
  logo: string | null;
}

interface QueueSnapshot {
  business: QueueBusiness;
  queue: {
    enabled: boolean;
    isOpen: boolean;
    isFull: boolean;
    closedReason: string | null;
    maxLength: number;
    waitingCount: number;
    estimatedWaitMinutes: number;
    whatsappUpdates: boolean;
    seated: { serviceName: string | null; remainingMinutes: number } | null;
  };
  services: Array<{ id: number; name: string; duration: number | null; price: string | null }>;
  shareUrl: string;
}

interface PublicTicket {
  token: string;
  name: string;
  status: string;
  isActive: boolean;
  position: number | null;
  etaMinutes: number | null;
  joinedAt: string;
  service: { id: number; name: string; duration: number | null; price: string | null } | null;
  business: { id: number; name: string; phone: string | null; address: string | null };
  estimatedWaitMinutes: number;
  queueOpen?: boolean;
}

const STATUS_COPY: Record<string, { title: string; hint: string }> = {
  waiting: { title: "Estás en la cola", hint: "Puedes salir y volver; mira tu posición aquí." },
  notified: { title: "¡Ya casi es tu turno!", hint: "Acércate al local ahora." },
  seated: { title: "Estás en la silla", hint: "Disfruta tu servicio." },
  served: { title: "¡Listo, gracias!", hint: "Tu servicio terminó. Vuelve pronto." },
  left: { title: "Turno cerrado", hint: "El local cerró tu turno porque no llegaste." },
  cancelled: { title: "Turno cancelado", hint: "Puedes tomar uno nuevo cuando quieras." },
};

const tokenKey = (businessId: number) => `micita_queue_${businessId}`;

export default function QueuePage() {
  const { businessId: rawBusinessId } = useParams<{ businessId: string }>();
  const businessId = Number(rawBusinessId);
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    // WhatsApp links carry the ticket token, so the customer can reopen their
    // turn on any device: /q/12?ticket=abc
    const fromQuery = new URLSearchParams(window.location.search).get("ticket")?.trim() ?? "";
    if (fromQuery) {
      window.localStorage.setItem(tokenKey(businessId), fromQuery);
      return fromQuery;
    }
    return window.localStorage.getItem(tokenKey(businessId)) ?? "";
  });
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const snapshotQuery = useQuery<QueueSnapshot>({
    queryKey: [`/api/public/queue/${businessId}`],
    enabled: Number.isInteger(businessId) && businessId > 0,
    refetchInterval: 20_000,
  });

  const ticketQuery = useQuery<PublicTicket>({
    queryKey: [`/api/public/queue/tickets/${token}`],
    enabled: Boolean(token),
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await fetch(`/api/public/queue/tickets/${token}`);
      if (res.status === 404) {
        window.localStorage.removeItem(tokenKey(businessId));
        setToken("");
        throw new Error("Turno no encontrado");
      }
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.message || "Error cargando tu turno");
      return payload as PublicTicket;
    },
  });

  const activeServiceId = serviceId || String(snapshotQuery.data?.services[0]?.id ?? "");

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!activeServiceId) throw new Error("Elige un servicio");
      if (name.trim().length < 2) throw new Error("Escribe tu nombre");
      return publicJson<PublicTicket>(`/api/public/queue/${businessId}/tickets`, "POST", {
        name: name.trim(),
        phone: phone.trim() || undefined,
        serviceId: Number(activeServiceId),
      });
    },
    onSuccess: (ticket) => {
      window.localStorage.setItem(tokenKey(businessId), ticket.token);
      setToken(ticket.token);
      setMessage(null);
      queryClient.invalidateQueries({ queryKey: [`/api/public/queue/${businessId}`] });
    },
    onError: (error: any) => setMessage(error?.message ?? "No se pudo tomar el turno"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => publicJson(`/api/public/queue/tickets/${token}/cancel`, "POST", {}),
    onSuccess: () => {
      setMessage("Tu turno fue cancelado.");
      queryClient.invalidateQueries({ queryKey: [`/api/public/queue/tickets/${token}`] });
    },
    onError: (error: any) => setMessage(error?.message ?? "No se pudo cancelar el turno"),
  });

  const ticket = ticketQuery.data;
  const snapshot = snapshotQuery.data;
  const statusCopy = ticket ? STATUS_COPY[ticket.status] ?? STATUS_COPY.waiting : null;
  const etaClock = useMemo(() => {
    if (!ticket?.etaMinutes || ticket.etaMinutes <= 0) return null;
    return formatLimaTime(new Date(Date.now() + ticket.etaMinutes * 60_000).toISOString());
  }, [ticket?.etaMinutes]);

  const resetTicket = () => {
    window.localStorage.removeItem(tokenKey(businessId));
    setToken("");
    setMessage(null);
    queryClient.removeQueries({ queryKey: [`/api/public/queue/tickets/${token}`] });
  };


  if (snapshotQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    );
  }

  if (snapshotQuery.error || !snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold">Cola no disponible</h1>
            <p className="text-sm text-muted-foreground">
              No encontramos este negocio. Revisa el enlace o pide ayuda en el local.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const business = ticket?.business ?? snapshot.business;
  const phoneHref = business.phone ? `tel:${business.phone}` : undefined;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between p-4">
          <MicitaLogo href="/" size="sm" />
          {phoneHref ? (
            <a href={phoneHref} className="flex items-center gap-1 text-sm text-neutral-600">
              <MessageCircle className="h-4 w-4" />
              {business.phone}
            </a>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 pb-10">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[business.address, snapshot.business.district, snapshot.business.city]
              .filter(Boolean)
              .join(", ") || "Perú"}
          </p>
        </div>

        {!token ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Saca tu turno</CardTitle>
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {snapshot.queue.waitingCount} en cola
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{snapshot.queue.estimatedWaitMinutes} min
                </span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!snapshot.queue.isOpen || snapshot.queue.isFull) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {snapshot.queue.closedReason ?? "La cola está cerrada en este momento."}
                </div>
              )}
              <div className="space-y-2">
                <Label>¿Qué servicio quieres?</Label>
                <Select value={activeServiceId} onValueChange={setServiceId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Elige un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshot.services.map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name}
                        {service.price ? ` — ${formatPEN(service.price)}` : ""}
                        {service.duration ? ` (${service.duration} min)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="queue-name">Tu nombre</Label>
                <Input
                  id="queue-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Carlos"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="queue-phone">Celular (opcional)</Label>
                <Input
                  id="queue-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="999 999 999"
                  inputMode="tel"
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground">
                  {snapshotQuery.data?.queue.whatsappUpdates
                    ? "Si lo dejas, recibirás tu posición y el aviso cuando casi sea tu turno por WhatsApp."
                    : "Si lo dejas, el local puede avisarte por WhatsApp cuando casi sea tu turno."}
                </p>
              </div>

              {message && <p className="text-sm text-red-600">{message}</p>}

              <Button
                className="h-14 w-full text-base font-semibold"
                onClick={() => joinMutation.mutate()}
                disabled={
                  joinMutation.isPending ||
                  snapshot.services.length === 0 ||
                  !snapshot.queue.isOpen ||
                  snapshot.queue.isFull
                }
              >
                {snapshot.services.length === 0
                  ? "Sin servicios disponibles"
                  : !snapshot.queue.isOpen
                    ? "Cola cerrada"
                    : snapshot.queue.isFull
                      ? "Cola llena"
                      : "Saca tu turno"}
              </Button>
            </CardContent>
          </Card>
        ) : null}


        {token ? (
          ticketQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
            </div>
          ) : ticketQuery.error ? (
            <Card>
              <CardContent className="space-y-3 p-6 text-center">
                <XCircle className="mx-auto h-10 w-10 text-red-500" />
                <p className="text-sm text-muted-foreground">
                  No encontramos tu turno. Puede haber sido cerrado por el local.
                </p>
                <Button onClick={resetTicket}>Volver a la cola</Button>
              </CardContent>
            </Card>
          ) : ticket && statusCopy ? (
            <Card>
              <CardContent className="space-y-4 p-6 text-center">
                <Badge variant={ticket.isActive ? "default" : "secondary"} className="mx-auto">
                  {ticket.status === "waiting"
                    ? "EN COLA"
                    : ticket.status === "notified"
                      ? "AVISADO"
                      : ticket.status === "seated"
                        ? "EN ATENCIÓN"
                        : "CERRADO"}
                </Badge>

                {ticket.position ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Eres el</p>
                    <p className="text-6xl font-black text-red-600">#{ticket.position}</p>
                  </div>
                ) : (
                  <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
                )}

                <div>
                  <p className="text-xl font-semibold">{statusCopy.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{statusCopy.hint}</p>
                </div>

                {ticket.isActive && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Espera aprox.</p>
                      <p className="text-lg font-bold">
                        {ticket.etaMinutes && ticket.etaMinutes > 0
                          ? `${ticket.etaMinutes} min`
                          : "Ahora"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tu hora estimada</p>
                      <p className="text-lg font-bold">{etaClock ?? "—"}</p>
                    </div>
                  </div>
                )}

                {ticket.service && (
                  <p className="text-sm text-muted-foreground">
                    {ticket.service.name}
                    {ticket.service.price ? ` · ${formatPEN(ticket.service.price)}` : ""}
                  </p>
                )}

                {ticket.isActive && ticket.queueOpen === false && (
                  <p className="text-xs text-amber-700">
                    El local pausó nuevos turnos. Tu turno actual sigue válido.
                  </p>
                )}

                {ticket.isActive ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (window.confirm("¿Cancelar tu turno?")) cancelMutation.mutate();
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancelar mi turno
                  </Button>
                ) : (
                  <Button className="w-full" onClick={resetTicket}>
                    Tomar otro turno
                  </Button>
                )}

                {message && <p className="text-sm text-muted-foreground">{message}</p>}
              </CardContent>
            </Card>
          ) : null
        ) : null}

        {snapshot.queue.seated && (
          <p className="text-center text-xs text-muted-foreground">
            Ahora en la silla: {snapshot.queue.seated.serviceName ?? "servicio"} · quedan ~
            {snapshot.queue.seated.remainingMinutes} min
          </p>
        )}

        <p className="text-center text-xs text-neutral-400">Turnos con MiCita</p>
      </main>
    </div>
  );
}
