import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { CheckCircle2, Ticket, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PublicPageShell } from "@/components/public-page-header";
import { publicJson } from "@/lib/public-api";

interface PackageDetail {
  package: {
    id: number;
    name: string;
    description: string | null;
    uses: number;
    price: string;
    validityDays: number;
    serviceName: string;
  };
  business: { id: number; name: string; phone: string | null };
  checkoutAvailable: boolean;
}

interface PackageCardPayload {
  purchase: {
    id: number;
    name: string;
    token: string;
    status: string;
    usesTotal: number;
    usesRemaining: number;
    amountPaid: string;
    purchasedAt: string | null;
    expiresAt: string | null;
  };
  package: { id: number; name: string; description: string | null; uses: number; price: string };
  business: { id: number; name: string; phone: string | null };
  history: Array<{ id: number; usesUsed: number; createdAt: string | null }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pago pendiente",
  active: "Activo",
  used: "Usado",
  expired: "Vencido",
  cancelled: "Cancelado",
};

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
          <h1 className="text-xl font-bold">Bono no encontrado</h1>
          <p className="text-sm text-muted-foreground">{text}</p>
          <Button className="w-full" onClick={() => (window.location.href = "/")}>
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}

export function PackageBuyPage() {
  const { packageId: rawPackageId } = useParams<{ packageId: string }>();
  const packageId = Number(rawPackageId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PackageDetail>({
    queryKey: [`/api/public/packages/${packageId}`],
    enabled: Number.isInteger(packageId) && packageId > 0,
  });

  const buy = async () => {
    if (!name.trim() || !phone.trim()) {
      setMessage("Completa tu nombre y celular");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await publicJson<{ checkoutUrl: string }>(
        `/api/public/packages/${packageId}/purchase`,
        "POST",
        { name: name.trim(), phone: phone.trim() },
      );
      window.location.href = result.checkoutUrl;
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo iniciar la compra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loading />;
  if (error || !data) return <NotFound text="Este bono ya no está disponible." />;

  return (
    <PublicPageShell businessName={data.business.name} phone={data.business.phone}>
      <Card className="overflow-hidden border-amber-200">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
              {data.business.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{data.package.name}</h1>
            <p className="mt-2 text-sm text-amber-50">
              {data.package.uses} usos de {data.package.serviceName} · válido{" "}
              {data.package.validityDays} días
            </p>
          </div>
          <CardContent className="space-y-4 p-6">
            <p className="text-3xl font-bold">S/ {Number(data.package.price).toFixed(2)}</p>
            {data.package.description && (
              <p className="text-sm text-muted-foreground">{data.package.description}</p>
            )}

            {data.checkoutAvailable ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="package-name">Tu nombre</Label>
                  <Input
                    id="package-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package-phone">Celular / WhatsApp</Label>
                  <Input
                    id="package-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    inputMode="tel"
                    maxLength={30}
                    placeholder="999 999 999"
                  />
                </div>
                {message && <p className="text-sm text-red-600">{message}</p>}
                <Button className="w-full" onClick={buy} disabled={isSubmitting}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Abriendo pago…" : "Comprar bono"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pago seguro con MercadoPago. El bono queda en tu WhatsApp.
                </p>
              </>
            ) : (
              <>
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  La compra online no está disponible. Pídelo en el local y el equipo activará tu
                  bono.
                </p>
                {data.business.phone && (
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={`https://wa.me/${data.business.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola, quiero comprar el bono ${data.package.name}.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Coordinar por WhatsApp
                    </a>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
    </PublicPageShell>
  );
}


export function PackageCardPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery<PackageCardPayload>({
    queryKey: [`/api/public/packages/t/${token}`],
    enabled: Boolean(token),
  });

  if (isLoading) return <Loading />;
  if (error || !data) return <NotFound text="Revisa el enlace o pide tu bono en el local." />;

  const used = data.purchase.usesTotal - data.purchase.usesRemaining;
  const active = data.purchase.status === "active" && data.purchase.usesRemaining > 0;

  return (
    <PublicPageShell businessName={data.business.name} phone={data.business.phone}>
      <Card className="overflow-hidden border-amber-200">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {data.business.name}
                </p>
                <h1 className="mt-1 text-2xl font-bold">{data.package.name}</h1>
                <p className="mt-1 text-sm text-amber-50">A nombre de {data.purchase.name}</p>
              </div>
              <Badge variant={active ? "default" : "secondary"}>
                {STATUS_LABELS[data.purchase.status] ?? data.purchase.status}
              </Badge>
            </div>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-4xl font-bold text-amber-900">{data.purchase.usesRemaining}</p>
              <p className="text-sm text-amber-800">usos disponibles de {data.purchase.usesTotal}</p>
            </div>
            <div className="flex justify-center gap-2">
              {Array.from({ length: data.purchase.usesTotal }).map((_, index) => (
                <div
                  key={index}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    index < used ? "bg-neutral-200 text-neutral-400" : "bg-amber-400 text-white"
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="font-medium">S/ {Number(data.purchase.amountPaid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vence</span>
                <span className="font-medium">
                  {data.purchase.expiresAt
                    ? new Date(data.purchase.expiresAt).toLocaleDateString("es-PE")
                    : "—"}
                </span>
              </div>
            </div>
            {active && (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Muéstralo en el local para usar un servicio.
              </p>
            )}
            {data.purchase.status === "pending" && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Estamos esperando la confirmación del pago. Actualiza en unos segundos.
              </p>
            )}
            {data.purchase.status === "expired" && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                Este bono venció. Consulta en el local si puede reactivarse.
              </p>
            )}
          </CardContent>
        </Card>

        {data.history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Usos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.history.map((entry) => (
                <div key={entry.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString("es-PE")
                      : "Uso"}
                  </span>
                  <span className="font-medium">-{entry.usesUsed}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">Gestionado con MiCita</p>
    </PublicPageShell>
  );
}
