import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Calendar, CheckCircle2, Clock, MapPin, Tag, Users, XCircle } from "lucide-react";
import { PublicPageShell } from "@/components/public-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLimaTime, formatPEN } from "@/lib/desk-api";
import { publicJson } from "@/lib/public-api";

interface PublicPromo {
  promo: {
    code: string;
    title: string;
    description: string | null;
    price: string;
    originalPrice: string | null;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    claimed: number;
    remaining: number;
    message: string | null;
  };
  business: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    district: string | null;
    city: string | null;
  };
  service: { id: number; name: string; price: string | null; duration: number | null } | null;
  slots: Array<{ time: string; available: boolean }>;
  availableSlots: number;
  state: string;
  closedReason: string | null;
  publicUrl: string;
  shareText: string;
  whatsappShareUrl: string;
  botUrl: string | null;
}

interface PromoClaimView {
  token: string;
  status: string;
  name: string;
  date: string;
  time: string;
  appointmentStatus: string | null;
  promo: { code: string; title: string; price: string };
  business: { id: number; name: string; phone: string | null; address: string | null };
}

const tokenKey = (code: string) => `micita_promo_${code.toUpperCase()}`;

export default function PromoPage() {
  const { code = "" } = useParams<{ code: string }>();
  const queryClient = useQueryClient();
  const [claimToken, setClaimToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(tokenKey(code)) ?? "";
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const promoQuery = useQuery<PublicPromo>({
    queryKey: [`/api/public/promos/${code}`],
    enabled: Boolean(code),
    refetchInterval: 30_000,
  });

  const claimQuery = useQuery<PromoClaimView>({
    queryKey: [`/api/public/promos/${code}/claims/${claimToken}`],
    enabled: Boolean(claimToken),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!promoQuery.data) return;
    if (!selectedTime) {
      const firstOpen = promoQuery.data.slots.find((slot) => slot.available);
      if (firstOpen) setSelectedTime(firstOpen.time);
    }
  }, [promoQuery.data, selectedTime]);

  const claimMutation = useMutation({
    mutationFn: () =>
      publicJson<{ claim: { token: string } }>(`/api/public/promos/${code}/claims`, "POST", {
        time: selectedTime,
        name: name.trim(),
        phone: phone.trim() || undefined,
      }),
    onSuccess: async (result) => {
      window.localStorage.setItem(tokenKey(code), result.claim.token);
      setClaimToken(result.claim.token);
      setMessage(null);
      await queryClient.invalidateQueries({ queryKey: [`/api/public/promos/${code}`] });
    },
    onError: (error: any) => setMessage(error?.message ?? "No se pudo reservar la promo"),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      publicJson(`/api/public/promos/${code}/claims/${claimToken}/cancel`, "POST", {}),
    onSuccess: () => {
      setMessage("Tu reserva fue cancelada.");
      queryClient.invalidateQueries({ queryKey: [`/api/public/promos/${code}/claims/${claimToken}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/public/promos/${code}`] });
    },
    onError: (error: any) => setMessage(error?.message ?? "No se pudo cancelar"),
  });

  const promo = promoQuery.data;
  const claim = claimQuery.data;

  const dateLabel = useMemo(() => {
    if (!promo) return "";
    return new Date(`${promo.promo.date}T12:00:00`).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [promo]);

  const resetClaim = () => {
    window.localStorage.removeItem(tokenKey(code));
    setClaimToken("");
    setMessage(null);
    queryClient.removeQueries({ queryKey: [`/api/public/promos/${code}/claims/${claimToken}`] });
  };

  if (promoQuery.isLoading) {
    return (
      <PublicPageShell maxWidth="max-w-md">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
        </div>
      </PublicPageShell>
    );
  }

  if (promoQuery.error || !promo) {
    return (
      <PublicPageShell maxWidth="max-w-md">
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold">Promo no encontrada</h1>
            <p className="text-sm text-muted-foreground">
              El enlace puede haber expirado o la promoción fue eliminada.
            </p>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  const business = claim?.business ?? promo.business;

  return (
    <PublicPageShell businessName={business.name} phone={business.phone} maxWidth="max-w-md">
      <div>
        <p className="text-sm text-muted-foreground">{business.name}</p>
        <h1 className="text-2xl font-bold">{promo.promo.title}</h1>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {[business.address, promo.business.district, promo.business.city]
            .filter(Boolean)
            .join(", ") || "Perú"}
        </p>
      </div>

        <Card className="overflow-hidden border-emerald-200">
          <CardContent className="space-y-3 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-emerald-700">
                  <Tag className="h-3.5 w-3.5" />
                  Precio promo
                </p>
                <p className="text-4xl font-black text-emerald-700">{formatPEN(promo.promo.price)}</p>
                {promo.promo.originalPrice && (
                  <p className="text-sm text-muted-foreground line-through">
                    antes {formatPEN(promo.promo.originalPrice)}
                  </p>
                )}
              </div>
              <Badge variant={promo.state === "open" ? "default" : "secondary"}>
                {promo.state === "open" ? "DISPONIBLE" : "CERRADA"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {dateLabel}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {promo.promo.startTime}–{promo.promo.endTime}
              </p>
              <p className="col-span-2 flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {promo.promo.remaining} de {promo.promo.capacity} cupos disponibles
              </p>
            </div>

            {promo.promo.description && (
              <p className="text-sm text-muted-foreground">{promo.promo.description}</p>
            )}
          </CardContent>
        </Card>


        {claimToken ? (
          claimQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
            </div>
          ) : claimQuery.error ? (
            <Card>
              <CardContent className="space-y-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">No encontramos tu reserva.</p>
                <Button onClick={resetClaim}>Volver a la promo</Button>
              </CardContent>
            </Card>
          ) : claim ? (
            <Card>
              <CardContent className="space-y-3 p-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <p className="text-lg font-semibold">
                  {claim.status === "reserved" ? "¡Reserva confirmada!" : "Reserva cancelada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {claim.date} a las {claim.time} · {claim.promo.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Código de promo: <strong>{claim.promo.code}</strong>
                </p>
                {claim.appointmentStatus && (
                  <Badge variant="outline">Cita: {claim.appointmentStatus}</Badge>
                )}
                {claim.status === "reserved" ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (window.confirm("¿Cancelar tu reserva?")) cancelMutation.mutate();
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancelar reserva
                  </Button>
                ) : (
                  <Button className="w-full" onClick={resetClaim}>
                    Tomar otro horario
                  </Button>
                )}
                {message && <p className="text-sm text-muted-foreground">{message}</p>}
              </CardContent>
            </Card>
          ) : null
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Reserva tu horario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {promo.state !== "open" && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {promo.closedReason ?? "Esta promo no está disponible."}
                </div>
              )}

              {promo.slots.length > 0 && (
                <div>
                  <Label className="mb-2 block">Elige la hora</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {promo.slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-lg border p-2 text-sm font-medium transition ${
                          selectedTime === slot.time
                            ? "border-red-600 bg-red-50 text-red-700"
                            : "border-neutral-200 bg-white"
                        } ${!slot.available ? "cursor-not-allowed text-neutral-300 line-through" : ""}`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="promo-name">Tu nombre</Label>
                <Input
                  id="promo-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Carlos"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-phone">Celular (opcional)</Label>
                <Input
                  id="promo-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="999 999 999"
                  inputMode="tel"
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground">
                  Te confirmamos por WhatsApp y el local recibe tu reserva al instante.
                </p>
              </div>

              {message && <p className="text-sm text-red-600">{message}</p>}

              <Button
                className="h-14 w-full text-base font-semibold"
                onClick={() => claimMutation.mutate()}
                disabled={
                  claimMutation.isPending ||
                  promo.state !== "open" ||
                  !selectedTime ||
                  name.trim().length < 2
                }
              >
                {promo.state !== "open" ? "No disponible" : "Reservar mi cupo"}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-neutral-400">Promos con MiCita</p>
    </PublicPageShell>
  );
}
