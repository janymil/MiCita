import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  Share2,
  StopCircle,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import PromoFormDialog from "@/components/promo-form-dialog";
import PromoShareDialog from "@/components/promo-share-dialog";
import PromoClaimsDialog from "@/components/promo-claims-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  deskRequest,
  formatPEN,
  PROMO_STATE_LABELS,
  PROMO_STATE_VARIANTS,
  type DeskPromo,
  type DeskPromoListResponse,
  type DeskService,
} from "@/lib/desk-api";

interface DashboardBusiness {
  id: number;
  name: string;
}

export default function PromosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [sharePromo, setSharePromo] = useState<DeskPromo | null>(null);
  const [claimsPromo, setClaimsPromo] = useState<DeskPromo | null>(null);

  const { data: businesses, isLoading: businessesLoading } = useQuery<DashboardBusiness[]>({
    queryKey: ["/api/dashboard/businesses"],
  });
  const businessId = businesses?.[0]?.id;

  const { data, isLoading } = useQuery<DeskPromoListResponse>({
    queryKey: [`/api/dashboard/businesses/${businessId}/promos`],
    enabled: Boolean(businessId),
    refetchInterval: 30_000,
  });

  const { data: services } = useQuery<DeskService[]>({
    queryKey: [`/api/dashboard/businesses/${businessId}/services`],
    enabled: Boolean(businessId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ promoId, status }: { promoId: number; status: string }) =>
      deskRequest(`/api/dashboard/businesses/${businessId}/promos/${promoId}`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/promos`] });
      toast({ title: "Promo actualizada" });
    },
    onError: (error: any) =>
      toast({
        title: "No se pudo actualizar",
        description: error?.message ?? "Intenta nuevamente",
        variant: "destructive",
      }),
  });

  const invalidatePromos = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/promos`] });
    queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/today`] });
  };

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
          <Button asChild className="mt-4">
            <a href="/dashboard/create-business">Crear negocio</a>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const promos = data?.promos ?? [];
  const activePromos = promos.filter((promo) => promo.state === "open");

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold theme-text-primary">
              <Megaphone className="h-6 w-6" />
              Promos de horas muertas
            </h1>
            <p className="text-sm theme-text-secondary">
              Llena los huecos del día con un precio especial y cupos limitados.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/dashboard/configuracion?tab=operacion">Ajustes</a>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva promo
            </Button>
          </div>
        </div>

        {data && !data.promosEnabled && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Las promociones están desactivadas. Actívalas en{" "}
            <a href="/dashboard/configuracion?tab=operacion" className="font-semibold underline">
              Configuración → Operación
            </a>{" "}
            para que los clientes puedan reservar.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{activePromos.length}</p>
              <p className="text-xs text-muted-foreground">promos activas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">
                {promos.reduce((sum, promo) => sum + promo.claimed, 0)}
              </p>
              <p className="text-xs text-muted-foreground">cupos reservados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{data?.todayAppointments ?? 0}</p>
              <p className="text-xs text-muted-foreground">citas promo hoy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">
                {formatPEN(promos.reduce((sum, promo) => sum + Number(promo.price) * promo.claimed, 0))}
              </p>
              <p className="text-xs text-muted-foreground">ingreso promo potencial</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
          </div>
        ) : promos.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-8 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aún no tienes promos. Crea una para llenar una hora muerta con un precio especial.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear mi primera promo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {promos.map((promo) => (
              <Card key={promo.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {promo.title}
                      <Badge variant={PROMO_STATE_VARIANTS[promo.state] ?? "outline"}>
                        {PROMO_STATE_LABELS[promo.state] ?? promo.state}
                      </Badge>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {promo.service?.name ?? "Servicio"} · {promo.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-700">{formatPEN(promo.price)}</p>
                    {promo.service?.price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPEN(promo.service.price)}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {promo.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {promo.startTime}–{promo.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {promo.claimed}/{promo.capacity} cupos
                    </span>
                  </div>


                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setSharePromo(promo)}>
                      <Share2 className="mr-1 h-4 w-4" />
                      Compartir
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setClaimsPromo(promo)}>
                      <Users className="mr-1 h-4 w-4" />
                      Reservas
                    </Button>
                    {promo.status === "active" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => statusMutation.mutate({ promoId: promo.id, status: "paused" })}
                        disabled={statusMutation.isPending}
                      >
                        <PauseCircle className="mr-1 h-4 w-4" />
                        Pausar
                      </Button>
                    ) : promo.status === "paused" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => statusMutation.mutate({ promoId: promo.id, status: "active" })}
                        disabled={statusMutation.isPending}
                      >
                        <PlayCircle className="mr-1 h-4 w-4" />
                        Activar
                      </Button>
                    ) : null}
                    {promo.status !== "ended" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => {
                          if (window.confirm("¿Terminar esta promo? Ya no se podrá reservar.")) {
                            statusMutation.mutate({ promoId: promo.id, status: "ended" });
                          }
                        }}
                        disabled={statusMutation.isPending}
                      >
                        <StopCircle className="mr-1 h-4 w-4" />
                        Terminar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PromoFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        businessId={businessId}
        services={services ?? []}
        onCreated={(promo) => {
          invalidatePromos();
          setSharePromo(promo);
        }}
      />
      <PromoShareDialog
        open={Boolean(sharePromo)}
        onOpenChange={(open) => {
          if (!open) setSharePromo(null);
        }}
        promo={sharePromo}
      />
      <PromoClaimsDialog
        open={Boolean(claimsPromo)}
        onOpenChange={(open) => {
          if (!open) setClaimsPromo(null);
        }}
        businessId={businessId}
        promo={claimsPromo}
      />
    </DashboardLayout>
  );
}
