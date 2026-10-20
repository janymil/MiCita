import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicPageShell } from "@/components/public-page-header";
import { publicJson } from "@/lib/public-api";

interface WaitlistEntryPayload {
  entry: {
    id: number;
    status: string;
    date: string;
    offeredDate: string | null;
    offeredTime: string | null;
  };
  business: { id: number; name: string; phone: string | null };
  service: { id: number; name: string; duration: number | null } | null;
  appointment: {
    id: number;
    status: string;
    depositStatus: string | null;
    manageUrl: string | null;
  } | null;
  canClaim: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: "En espera",
  notified: "Cupo disponible",
  claimed: "Reservado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export default function WaitlistClaimPage() {
  const { token } = useParams<{ token: string }>();
  const [isClaiming, setIsClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<{
    manageUrl: string;
    depositRequired: boolean;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery<WaitlistEntryPayload>({
    queryKey: [`/api/public/waitlist/t/${token}`],
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  const claim = async () => {
    setIsClaiming(true);
    setMessage(null);
    try {
      const result = await publicJson<{
        manageUrl: string;
        depositRequired: boolean;
        message: string;
      }>(`/api/public/waitlist/t/${token}/claim`, "POST", {});
      setClaimed({ manageUrl: result.manageUrl, depositRequired: result.depositRequired });
      void refetch();
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo reservar el cupo");
      void refetch();
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <PublicPageShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      </PublicPageShell>
    );
  }

  if (error || !data) {
    return (
      <PublicPageShell>
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground">
              No encontramos esta entrada en la lista de espera.
            </p>
            <Button className="w-full" onClick={() => (window.location.href = "/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  const appointmentUrl = claimed?.manageUrl ?? data.appointment?.manageUrl ?? null;
  const success = Boolean(claimed) || data.entry.status === "claimed";
  const offered = data.entry.offeredDate && data.entry.offeredTime;

  return (
    <PublicPageShell businessName={data.business.name} phone={data.business.phone}>
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-red-600" />
                {data.business.name}
              </span>
              <Badge variant={success ? "default" : offered ? "secondary" : "outline"}>
                {STATUS_LABELS[data.entry.status] ?? data.entry.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servicio</span>
              <span className="font-medium">{data.service?.name ?? "Servicio"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Día que buscabas</span>
              <span className="font-medium">{data.entry.date}</span>
            </div>
            {offered && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cupo liberado</span>
                <span className="font-bold text-emerald-700">
                  {data.entry.offeredDate} · {data.entry.offeredTime}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {success ? (
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardContent className="space-y-4 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="text-xl font-bold">¡Cupo reservado!</h2>
              <p className="text-sm text-emerald-800">
                {claimed?.depositRequired
                  ? "Tu cita quedó pendiente del depósito. Completa el pago para confirmarla."
                  : "Tu cita quedó confirmada. Te esperamos."}
              </p>
              {appointmentUrl && (
                <Button asChild className="w-full">
                  <a href={appointmentUrl}>Ver o pagar mi cita</a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : data.canClaim && offered ? (
          <Card className="border-emerald-200">
            <CardContent className="space-y-4 p-6 text-center">
              <h2 className="text-lg font-bold">Se liberó un cupo</h2>
              <p className="text-sm text-muted-foreground">
                {offered} para {data.service?.name ?? "tu servicio"}. El primero que confirme se
                queda con el horario.
              </p>
              {message && <p className="text-sm text-red-600">{message}</p>}
              <Button className="w-full" onClick={claim} disabled={isClaiming}>
                {isClaiming ? "Reservando…" : "Reservar este cupo"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 p-6 text-center text-sm text-muted-foreground">
              <p>
                Sigues en la lista para {data.entry.date}. Te avisaremos por WhatsApp cuando se
                libere un cupo.
              </p>
              {message && <p className="text-red-600">{message}</p>}
              <Button variant="outline" className="w-full" onClick={() => refetch()}>
                Actualizar
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">Gestionado con MiCita</p>
    </PublicPageShell>
  );
}
