import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Gift, Phone, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicPageShell } from "@/components/public-page-header";
import { publicJson } from "@/lib/public-api";

interface LoyaltyPayload {
  business: { id: number; name: string } | null;
  card: {
    id: number;
    name: string;
    token: string;
    totalStamps: number;
    rewardsRedeemed: number;
    lastStampAt: string | null;
  };
  progress: {
    totalStamps: number;
    required: number;
    progress: number;
    availableRewards: number;
  };
  reward: string;
  history: Array<{
    id: number;
    type: string;
    stampsDelta: number;
    note: string | null;
    createdAt: string | null;
  }>;
}

function Loading() {
  return (
    <PublicPageShell>
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    </PublicPageShell>
  );
}

function NotFound({ text }: { text: string }) {
  return (
    <PublicPageShell>
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold">Tarjeta no encontrada</h1>
          <p className="text-sm text-muted-foreground">{text}</p>
          <Button className="w-full" onClick={() => (window.location.href = "/")}>
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}

function LoyaltyCardView({ data }: { data: LoyaltyPayload }) {
  const required = data.progress.required;
  const progress = data.progress.progress;
  const rewards = data.progress.availableRewards;

  return (
    <PublicPageShell businessName={data.business?.name}>
      <Card className="overflow-hidden border-amber-200">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
              {data.business?.name ?? "MiCita"}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{data.card.name}</h1>
            <p className="mt-2 text-sm text-amber-50">
              {rewards > 0
                ? `Tienes ${rewards} recompensa${rewards === 1 ? "" : "s"} disponible${rewards === 1 ? "" : "s"}`
                : `${required - progress} sello${required - progress === 1 ? "" : "s"} para tu premio`}
            </p>
          </div>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: required }).map((_, index) => (
                <div
                  key={index}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                    index < progress
                      ? "border-amber-500 bg-amber-400 text-white"
                      : "border-neutral-200 bg-white text-neutral-300"
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {progress}/{required} sellos en esta tarjeta · {data.card.totalStamps} visitas en total
            </p>

            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <Gift className="mx-auto mb-1 h-6 w-6 text-amber-600" />
              <p className="text-sm font-semibold text-amber-900">Premio: {data.reward}</p>
              <p className="mt-1 text-xs text-amber-800">
                Muéstrala en el local para canjearla.
              </p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <a href={`/tarjeta/t/${data.card.token}`}>Guardar enlace de mi tarjeta</a>
            </Button>
          </CardContent>
        </Card>

        {data.history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.history.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {event.type === "stamp"
                      ? "Sello ganado"
                      : event.type === "redeem"
                        ? "Recompensa canjeada"
                        : "Ajuste"}
                  </span>
                  <span className="font-medium">
                    {event.type === "stamp" ? `+${event.stampsDelta}` : "—"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">Gestionado con MiCita</p>
    </PublicPageShell>
  );
}

export function LoyaltyLookupPage() {
  const { businessId: rawBusinessId } = useParams<{ businessId: string }>();
  const businessId = Number(rawBusinessId);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [card, setCard] = useState<LoyaltyPayload | null>(null);

  const { data: snapshot, isLoading } = useQuery<{
    business: { id: number; name: string };
    enabled: boolean;
    required: number;
    reward: string;
  }>({
    queryKey: [`/api/public/loyalty/${businessId}`],
    enabled: Number.isInteger(businessId) && businessId > 0,
  });

  const lookup = async () => {
    if (!phone.trim()) {
      setMessage("Escribe tu celular");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload = await publicJson<LoyaltyPayload>(
        `/api/public/loyalty/${businessId}/lookup`,
        "POST",
        { phone: phone.trim() },
      );
      setCard(payload);
    } catch (e: any) {
      setMessage(e?.message ?? "No encontramos tu tarjeta");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loading />;
  if (!snapshot?.enabled) return <NotFound text="Este negocio no tiene tarjeta de fidelidad activa." />;
  if (card) return <LoyaltyCardView data={card} />;

  return (
    <PublicPageShell businessName={snapshot?.business.name}>
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Tarjeta de {snapshot.business.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Junta {snapshot.required} sellos y gana {snapshot.reward}. Escribe el celular con el
              que visitaste el local.
            </p>
            <div className="space-y-2">
              <Label htmlFor="loyalty-phone">Tu celular</Label>
              <Input
                id="loyalty-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                maxLength={30}
                placeholder="999 999 999"
              />
            </div>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <Button className="w-full" onClick={lookup} disabled={isSubmitting}>
              <Phone className="mr-2 h-4 w-4" />
              {isSubmitting ? "Buscando…" : "Ver mi tarjeta"}
            </Button>
          </CardContent>
        </Card>
    </PublicPageShell>
  );
}

export function LoyaltyCardPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery<LoyaltyPayload>({
    queryKey: [`/api/public/loyalty/t/${token}`],
    enabled: Boolean(token),
  });

  if (isLoading) return <Loading />;
  if (error || !data) return <NotFound text="Revisa el enlace o pide tu tarjeta en el local." />;
  return <LoyaltyCardView data={data} />;
}
